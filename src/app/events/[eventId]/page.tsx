"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GuestList } from "@/components/guest/guest-list";
import { SeatMap } from "@/components/seat/seat-map";
import { UploadDialog } from "@/components/dashboard/upload-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Event, Guest, GuestStatus, Seat } from "@/types";
import { GripVertical, Download, ArrowLeft, Edit } from "lucide-react";
import { exportGuestsToExcel } from "@/lib/excel-utils";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const eventId = params.eventId as string;

  // 현재 행사 정보 가져오기
  const { data: currentEventFromAPI, isLoading: isLoadingEvent } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) throw new Error('Failed to fetch event');
      return response.json() as Promise<Event>;
    },
  });

  // 행사의 게스트 데이터 가져오기
  const { data: guestsFromAPI = [], isLoading: isLoadingGuests } = useQuery({
    queryKey: ['guests', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/guests`);
      if (!response.ok) throw new Error('Failed to fetch guests');
      return response.json() as Promise<Guest[]>;
    },
  });

  // 내빈 생성 mutation
  const createGuestMutation = useMutation({
    mutationFn: async (guest: Guest) => {
      const response = await fetch(`/api/events/${eventId}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guest),
      });
      if (!response.ok) throw new Error('Failed to create guest');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests', eventId] });
      queryClient.invalidateQueries({ queryKey: ['all-guests'] }); // 메인 페이지 내빈 수 업데이트
    },
  });

  // 내빈 수정 mutation
  const updateGuestMutation = useMutation({
    mutationFn: async ({ guestId, updates }: { guestId: string; updates: Partial<Guest> }) => {
      const response = await fetch('/api/guests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId, updates }),
      });
      if (!response.ok) throw new Error('Failed to update guest');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests', eventId] });
    },
  });

  // 내빈 삭제 mutation
  const deleteGuestMutation = useMutation({
    mutationFn: async (guestId: string) => {
      const response = await fetch(`/api/guests?guestId=${guestId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete guest');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests', eventId] });
      queryClient.invalidateQueries({ queryKey: ['all-guests'] }); // 메인 페이지 내빈 수 업데이트
    },
  });

  // 행사 수정 mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ eventId, updates }: { eventId: string; updates: Partial<Event> }) => {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update event');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    },
  });

  // 현재 행사 상태 관리
  const [currentEvent, setCurrentEvent] = useState<Event | undefined>(currentEventFromAPI);
  const [isEditEventDialogOpen, setIsEditEventDialogOpen] = useState(false);

  // API에서 가져온 행사 정보를 로컬 상태에 반영
  useEffect(() => {
    if (currentEventFromAPI) {
      setCurrentEvent(currentEventFromAPI);
    }
  }, [currentEventFromAPI]);

  // 행사 정보 수정 폼 상태
  const [editEventForm, setEditEventForm] = useState({
    title: "",
    date: "",
    location: "",
    description: "",
  });

  // 공통 게스트 상태 관리
  const [guests, setGuests] = useState<Guest[]>([]);

  // API 데이터가 로드되면 로컬 상태에 반영
  useEffect(() => {
    if (guestsFromAPI.length > 0) {
      setGuests(guestsFromAPI);
    }
  }, [guestsFromAPI]);
  const [draggedGuest, setDraggedGuest] = useState<Guest | null>(null);
  const [guestListWidth, setGuestListWidth] = useState(45); // 45%
  const [isResizing, setIsResizing] = useState(false);
  const [importedGridSize, setImportedGridSize] = useState<{ rows: number; cols: number; rowLabels: string[] } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // 30% ~ 60% 범위로 제한
    if (newWidth >= 30 && newWidth <= 60) {
      setGuestListWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  // 마우스 이벤트 리스너
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', handleMouseMove as any);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove as any);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  });

  // 게스트 상태 업데이트 핸들러
  const handleUpdateGuestStatus = (guestId: string, status: GuestStatus, removeSeat?: boolean) => {
    const updates: Partial<Guest> = {
      status,
      updatedAt: new Date().toISOString(),
    };

    // 불참 처리 시 좌석 삭제 옵션 처리
    if (status === "cancelled" && removeSeat) {
      updates.seatNumber = null;
    }

    // Google Sheets에 저장
    updateGuestMutation.mutate({ guestId, updates });

    // 로컬 상태도 업데이트 (optimistic update)
    setGuests(prevGuests =>
      prevGuests.map(guest => {
        if (guest.id === guestId) {
          return { ...guest, ...updates };
        }
        return guest;
      })
    );
  };

  // 게스트 정보 업데이트 핸들러
  const handleUpdateGuest = (updatedGuest: Guest) => {
    const updates = {
      ...updatedGuest,
      updatedAt: new Date().toISOString(),
    };

    // Google Sheets에 저장
    updateGuestMutation.mutate({ guestId: updatedGuest.id, updates });

    // 로컬 상태도 업데이트 (optimistic update)
    setGuests(prevGuests =>
      prevGuests.map(guest =>
        guest.id === updatedGuest.id ? updates : guest
      )
    );
  };

  // 새 게스트 추가 핸들러
  const handleAddGuest = (newGuest: Omit<Guest, 'id' | 'updatedAt'>) => {
    const guest: Guest = {
      ...newGuest,
      id: `guest-${Date.now()}`,
      eventId: eventId, // 현재 행사 ID 추가
      updatedAt: new Date().toISOString(),
    };

    // Google Sheets에 저장
    createGuestMutation.mutate(guest);

    // 로컬 상태도 업데이트 (optimistic update)
    setGuests(prevGuests => [...prevGuests, guest]);
  };

  // 게스트에 좌석 배정 핸들러
  const handleAssignSeat = (guestId: string, seatNumber: string | null) => {
    const updates: Partial<Guest> = {
      seatNumber,
      updatedAt: new Date().toISOString(),
    };

    // Google Sheets에 저장
    updateGuestMutation.mutate({ guestId, updates });

    // 로컬 상태도 업데이트 (optimistic update)
    setGuests(prevGuests =>
      prevGuests.map(guest =>
        guest.id === guestId ? { ...guest, ...updates } : guest
      )
    );
  };

  // 게스트 삭제 핸들러
  const handleDeleteGuest = (guestId: string) => {
    // Google Sheets에서 삭제
    deleteGuestMutation.mutate(guestId);

    // 로컬 상태도 업데이트 (optimistic update)
    setGuests(prevGuests => prevGuests.filter(guest => guest.id !== guestId));
  };

  // 엑셀에서 게스트 가져오기
  const handleGuestsImport = (importedGuests: Guest[], gridSize?: { rows: number; cols: number; rowLabels: string[] }) => {
    setGuests(importedGuests);
    if (gridSize) {
      setImportedGridSize(gridSize);
      console.log(`${gridSize.rows}행 x ${gridSize.cols}열 그리드 생성`);
    }
  };

  // 엑셀로 내보내기
  const handleExportToExcel = () => {
    exportGuestsToExcel(guests);
  };

  // 행사 정보 수정 다이얼로그 열기
  const handleOpenEditEventDialog = () => {
    if (!currentEvent) return;

    // ISO 날짜를 datetime-local 형식으로 변환
    const dateObj = new Date(currentEvent.date);
    const localDatetime = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setEditEventForm({
      title: currentEvent.title,
      date: localDatetime,
      location: currentEvent.location,
      description: currentEvent.description || "",
    });
    setIsEditEventDialogOpen(true);
  };

  // 행사 정보 수정 저장
  const handleSaveEventEdit = () => {
    if (!currentEvent) return;

    const updates: Partial<Event> = {
      title: editEventForm.title,
      date: new Date(editEventForm.date).toISOString(),
      location: editEventForm.location,
      description: editEventForm.description,
      updatedAt: new Date().toISOString(),
    };

    // Google Sheets에 저장
    updateEventMutation.mutate({ eventId: currentEvent.id, updates });

    // 로컬 상태도 업데이트 (optimistic update)
    const updatedEvent: Event = {
      ...currentEvent,
      ...updates,
    };
    setCurrentEvent(updatedEvent);
    setIsEditEventDialogOpen(false);
  };

  if (isLoadingEvent) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">행사 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!currentEvent) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">행사를 찾을 수 없습니다</h1>
          <Button onClick={() => router.push('/')}>행사 목록으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header Area */}
      <header className="h-14 border-b flex items-center justify-between px-6 bg-white shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            목록
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <div>
            <h1 className="text-lg font-bold text-primary tracking-tight">{currentEvent.title}</h1>
            <p className="text-xs text-slate-500">{new Date(currentEvent.date).toLocaleDateString('ko-KR')} · {currentEvent.location}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenEditEventDialog}
            className="gap-2"
          >
            <Edit className="w-4 h-4" />
            행사 정보 수정
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportToExcel}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            엑셀 내보내기
          </Button>
          <UploadDialog onGuestsImport={handleGuestsImport} />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden" ref={containerRef}>
        <div className="flex h-full w-full">
          <div style={{ width: `${guestListWidth}%` }} className="bg-background border-r">
            <GuestList
              guests={guests}
              onUpdateGuestStatus={handleUpdateGuestStatus}
              onUpdateGuest={handleUpdateGuest}
              onAddGuest={handleAddGuest}
              onDeleteGuest={handleDeleteGuest}
              onDragStart={setDraggedGuest}
              onDragEnd={() => setDraggedGuest(null)}
            />
          </div>

          {/* Resize Handle */}
          <div
            onMouseDown={handleMouseDown}
            className={`w-1 bg-slate-200 hover:bg-slate-300 cursor-col-resize flex items-center justify-center transition-colors ${
              isResizing ? 'bg-slate-400' : ''
            }`}
          >
            <div className="h-8 w-4 flex items-center justify-center rounded-sm border border-slate-300 bg-white shadow-sm">
              <GripVertical className="h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div className="flex-1">
            <SeatMap
              guests={guests}
              onAssignSeat={handleAssignSeat}
              onUpdateGuestStatus={handleUpdateGuestStatus}
              onUpdateGuest={handleUpdateGuest}
              onDeleteGuest={handleDeleteGuest}
              draggedGuest={draggedGuest}
              importedGridSize={importedGridSize}
            />
          </div>
        </div>
      </div>

      {/* Edit Event Dialog */}
      <Dialog open={isEditEventDialogOpen} onOpenChange={setIsEditEventDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>행사 정보 수정</DialogTitle>
            <DialogDescription>
              행사 정보를 수정하세요
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">행사명 *</Label>
              <Input
                id="edit-title"
                placeholder="예: 2025 경기도 체육대상 시상식"
                value={editEventForm.title}
                onChange={(e) => setEditEventForm({ ...editEventForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-date">일시 *</Label>
              <Input
                id="edit-date"
                type="datetime-local"
                value={editEventForm.date}
                onChange={(e) => setEditEventForm({ ...editEventForm, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">장소 *</Label>
              <Input
                id="edit-location"
                placeholder="예: 경기도청 대강당"
                value={editEventForm.location}
                onChange={(e) => setEditEventForm({ ...editEventForm, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">설명</Label>
              <Textarea
                id="edit-description"
                placeholder="행사에 대한 간단한 설명을 입력하세요"
                value={editEventForm.description}
                onChange={(e) => setEditEventForm({ ...editEventForm, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditEventDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSaveEventEdit}
              disabled={!editEventForm.title || !editEventForm.date || !editEventForm.location}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
