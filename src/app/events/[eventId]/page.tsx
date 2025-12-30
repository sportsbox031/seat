"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GuestList } from "@/components/guest/guest-list";
import { SeatMap } from "@/components/seat/seat-map";
import { UploadDialog } from "@/components/dashboard/upload-dialog";
import { NameBadgePrint } from "@/components/print/name-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Event, Guest, GuestStatus, Seat } from "@/types";
import { GripVertical, Download, ArrowLeft, Edit, Loader2, Printer, PanelLeftClose, PanelLeft } from "lucide-react";
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['guests', eventId] });
      queryClient.invalidateQueries({ queryKey: ['all-guests'] });
      toast.success(`${variables.name}님이 추가되었습니다`);
    },
    onError: (error: Error) => {
      toast.error('내빈 추가 실패', {
        description: error.message,
      });
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
      toast.success('내빈 정보가 수정되었습니다');
    },
    onError: (error: Error) => {
      toast.error('내빈 수정 실패', {
        description: error.message,
      });
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
      queryClient.invalidateQueries({ queryKey: ['all-guests'] });
      toast.success('내빈이 삭제되었습니다');
    },
    onError: (error: Error) => {
      toast.error('내빈 삭제 실패', {
        description: error.message,
      });
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
      toast.success('행사 정보가 수정되었습니다');
    },
    onError: (error: Error) => {
      toast.error('행사 수정 실패', {
        description: error.message,
      });
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
  const [isPrintingBadges, setIsPrintingBadges] = useState(false);
  const [mobileTab, setMobileTab] = useState<'guests' | 'seats'>('guests'); // 모바일 탭
  const [isGuestListHidden, setIsGuestListHidden] = useState(false); // 내빈 리스트 숨김 상태
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
    // 필수 필드 검증
    if (!newGuest.name?.trim()) {
      toast.error('이름을 입력해주세요', {
        description: '내빈 이름은 필수 입력 항목입니다.',
      });
      return;
    }

    if (!newGuest.organization?.trim()) {
      toast.error('소속을 입력해주세요', {
        description: '소속은 필수 입력 항목입니다.',
      });
      return;
    }

    if (!newGuest.position?.trim()) {
      toast.error('직책을 입력해주세요', {
        description: '직책은 필수 입력 항목입니다.',
      });
      return;
    }

    // 중복 체크 (같은 이름 + 같은 소속)
    const isDuplicate = guests.some(
      (g) => g.name.trim().toLowerCase() === newGuest.name.trim().toLowerCase() &&
             g.organization.trim().toLowerCase() === newGuest.organization.trim().toLowerCase()
    );

    if (isDuplicate) {
      toast.error('중복된 내빈', {
        description: '같은 소속에 동일한 이름의 내빈이 이미 존재합니다.',
      });
      return;
    }

    const guest: Guest = {
      ...newGuest,
      name: newGuest.name.trim(),
      organization: newGuest.organization.trim(),
      position: newGuest.position.trim(),
      biography: newGuest.biography?.trim() || '',
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
    // 좌석 배정 해제의 경우 검증 불필요
    if (!seatNumber) {
      const updates: Partial<Guest> = {
        seatNumber: null,
        updatedAt: new Date().toISOString(),
      };

      updateGuestMutation.mutate({ guestId, updates });
      setGuests(prevGuests =>
        prevGuests.map(guest =>
          guest.id === guestId ? { ...guest, ...updates } : guest
        )
      );
      return;
    }

    // 이미 배정된 좌석인지 확인
    const existingGuest = guests.find(
      (g) => g.seatNumber === seatNumber && g.id !== guestId
    );

    if (existingGuest) {
      toast.error('이미 배정된 좌석', {
        description: `${seatNumber} 좌석은 이미 ${existingGuest.name}님에게 배정되어 있습니다.`,
      });
      return;
    }

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
    // 삭제될 내빈 정보 백업 (실행 취소용)
    const deletedGuest = guests.find(g => g.id === guestId);
    if (!deletedGuest) return;

    // 로컬 상태 업데이트 (optimistic update)
    setGuests(prevGuests => prevGuests.filter(guest => guest.id !== guestId));

    // Google Sheets에서 삭제
    deleteGuestMutation.mutate(guestId);

    // 실행 취소 가능한 Toast 표시
    toast.success(`${deletedGuest.name}님이 삭제되었습니다`, {
      action: {
        label: "실행 취소",
        onClick: () => {
          // 삭제 취소 - 다시 생성
          createGuestMutation.mutate(deletedGuest);
          setGuests(prevGuests => [...prevGuests, deletedGuest]);
          toast.success('삭제가 취소되었습니다');
        },
      },
      duration: 5000, // 5초간 실행 취소 가능
    });
  };

  // 좌석 배치도 설정 변경 핸들러
  const handleSeatLayoutChange = (layout: { rows: number; cols: number }) => {
    if (!currentEvent) return;

    const updates: Partial<Event> = {
      seatLayout: layout,
      updatedAt: new Date().toISOString(),
    };

    // Google Sheets에 저장
    updateEventMutation.mutate({ eventId: currentEvent.id, updates });

    // 로컬 상태도 업데이트 (optimistic update)
    setCurrentEvent({
      ...currentEvent,
      ...updates,
    });

    toast.success('좌석 배치도가 저장되었습니다');
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

        <div className="flex items-center gap-2 md:gap-4">
          {/* 데스크톱 전용: 내빈 리스트 토글 버튼 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsGuestListHidden(!isGuestListHidden)}
            className="hidden lg:flex gap-2"
          >
            {isGuestListHidden ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            <span>{isGuestListHidden ? '내빈 보기' : '좌석만 보기'}</span>
          </Button>
          <div className="hidden lg:block h-4 w-px bg-slate-200" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenEditEventDialog}
            className="gap-2"
          >
            <Edit className="w-4 h-4" />
            <span className="hidden md:inline">행사 정보 수정</span>
            <span className="md:hidden">수정</span>
          </Button>
          <div className="hidden md:block h-4 w-px bg-slate-200" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportToExcel}
            className="gap-1 md:gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">엑셀</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrintingBadges(true)}
            disabled={guests.length === 0}
            className="gap-1 md:gap-2"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">명찰</span>
          </Button>
          <UploadDialog onGuestsImport={handleGuestsImport} eventId={eventId} />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden" ref={containerRef}>
        {/* 모바일/태블릿: 탭 UI */}
        <div className="lg:hidden flex flex-col h-full">
          {/* 탭 헤더 */}
          <div className="flex border-b bg-white">
            <button
              onClick={() => setMobileTab('guests')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                mobileTab === 'guests'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              내빈 리스트 ({guests.length}명)
            </button>
            <button
              onClick={() => setMobileTab('seats')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                mobileTab === 'seats'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              좌석 배치도
            </button>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="flex-1 overflow-hidden">
            {mobileTab === 'guests' ? (
              <GuestList
                guests={guests}
                onUpdateGuestStatus={handleUpdateGuestStatus}
                onUpdateGuest={handleUpdateGuest}
                onAddGuest={handleAddGuest}
                onDeleteGuest={handleDeleteGuest}
                onDragStart={setDraggedGuest}
                onDragEnd={() => setDraggedGuest(null)}
              />
            ) : (
              <SeatMap
                guests={guests}
                onAssignSeat={handleAssignSeat}
                onUpdateGuestStatus={handleUpdateGuestStatus}
                onUpdateGuest={handleUpdateGuest}
                onDeleteGuest={handleDeleteGuest}
                draggedGuest={draggedGuest}
                importedGridSize={importedGridSize}
                seatLayout={currentEvent?.seatLayout}
                onSeatLayoutChange={handleSeatLayoutChange}
              />
            )}
          </div>
        </div>

        {/* 데스크톱: 분할 화면 또는 전체 화면 */}
        <div className="hidden lg:flex h-full w-full">
          {!isGuestListHidden && (
            <>
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
            </>
          )}

          <div className="flex-1">
            <SeatMap
              guests={guests}
              onAssignSeat={handleAssignSeat}
              onUpdateGuestStatus={handleUpdateGuestStatus}
              onUpdateGuest={handleUpdateGuest}
              onDeleteGuest={handleDeleteGuest}
              draggedGuest={draggedGuest}
              importedGridSize={importedGridSize}
              seatLayout={currentEvent?.seatLayout}
              onSeatLayoutChange={handleSeatLayoutChange}
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
              disabled={!editEventForm.title || !editEventForm.date || !editEventForm.location || updateEventMutation.isPending}
            >
              {updateEventMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 명찰 인쇄 */}
      {isPrintingBadges && currentEvent && (
        <NameBadgePrint
          guests={guests}
          eventTitle={currentEvent.title}
          onClose={() => setIsPrintingBadges(false)}
        />
      )}
    </div>
  );
}
