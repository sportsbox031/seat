"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Event, Guest } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Calendar, MapPin, Users, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function EventListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // React Query로 행사 데이터 가져오기
  const { data: eventsFromAPI = [], isLoading, error } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json() as Promise<Event[]>;
    },
  });

  // 모든 내빈 데이터 가져오기 (행사별 내빈 수 계산용)
  const { data: allGuests = [] } = useQuery({
    queryKey: ['all-guests'],
    queryFn: async () => {
      const response = await fetch('/api/guests');
      if (!response.ok) throw new Error('Failed to fetch guests');
      return response.json() as Promise<Guest[]>;
    },
  });

  // 행사 생성 mutation
  const createEventMutation = useMutation({
    mutationFn: async (event: Event) => {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
      if (!response.ok) throw new Error('Failed to create event');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  // 행사 삭제 mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete event');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const [events, setEvents] = useState<Event[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  // API 데이터가 로드되면 로컬 상태에 반영
  useEffect(() => {
    if (eventsFromAPI.length > 0) {
      setEvents(eventsFromAPI);
    }
  }, [eventsFromAPI]);

  // 새 행사 폼 상태
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    location: "",
    description: "",
  });

  const handleCreateEvent = () => {
    const event: Event = {
      id: `event-${Date.now()}`,
      title: newEvent.title,
      date: new Date(newEvent.date).toISOString(),
      location: newEvent.location,
      description: newEvent.description,
      status: "upcoming",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Google Sheets에 저장
    createEventMutation.mutate(event);

    // 로컬 상태도 업데이트 (optimistic update)
    setEvents([event, ...events]);
    setIsCreateDialogOpen(false);
    setNewEvent({ title: "", date: "", location: "", description: "" });
  };

  const handleDeleteEvent = (eventId: string) => {
    // Google Sheets에서 삭제
    deleteEventMutation.mutate(eventId);

    // 로컬 상태도 업데이트 (optimistic update)
    setEvents(events.filter(e => e.id !== eventId));
    setDeleteEventId(null);
  };

  const getEventGuestCount = (eventId: string) => {
    return allGuests.filter(g => g.eventId === eventId).length;
  };

  const getEventStatusBadge = (status: Event["status"]) => {
    const variants = {
      upcoming: { label: "예정", className: "bg-blue-100 text-blue-700" },
      ongoing: { label: "진행중", className: "bg-green-100 text-green-700" },
      completed: { label: "종료", className: "bg-slate-100 text-slate-700" },
    };
    const variant = variants[status];
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary tracking-tight">G-Protocol</h1>
              <p className="text-sm text-slate-600 mt-1">경기도 스마트 의전 시스템</p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              행사 등록
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">행사 목록</h2>
          <p className="text-sm text-slate-600 mt-1">
            {isLoading ? '로딩 중...' : `총 ${events.length}개의 행사`}
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">행사 목록을 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-red-500 mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">데이터를 불러오는데 실패했습니다</h3>
            <p className="text-sm text-slate-500">{(error as Error).message}</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">등록된 행사가 없습니다</h3>
            <p className="text-sm text-slate-500 mb-6">새로운 행사를 등록하여 내빈 관리를 시작하세요</p>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              첫 번째 행사 등록
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Card
                key={event.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => router.push(`/events/${event.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {event.title}
                      </CardTitle>
                    </div>
                    {getEventStatusBadge(event.status)}
                  </div>
                  <CardDescription className="space-y-2 mt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4" />
                      {new Date(event.date).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4" />
                      {event.location}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4" />
                      내빈 {getEventGuestCount(event.id)}명
                    </div>
                  </CardDescription>
                </CardHeader>
                {event.description && (
                  <CardContent>
                    <p className="text-sm text-slate-600 line-clamp-2">{event.description}</p>
                  </CardContent>
                )}
                <CardFooter className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/events/${event.id}`);
                    }}
                  >
                    행사 관리
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteEventId(event.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Event Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>새 행사 등록</DialogTitle>
            <DialogDescription>
              새로운 행사 정보를 입력하세요
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">행사명 *</Label>
              <Input
                id="title"
                placeholder="예: 2025 경기도 체육대상 시상식"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">일시 *</Label>
              <Input
                id="date"
                type="datetime-local"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">장소 *</Label>
              <Input
                id="location"
                placeholder="예: 경기도청 대강당"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                placeholder="행사에 대한 간단한 설명을 입력하세요"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleCreateEvent}
              disabled={!newEvent.title || !newEvent.date || !newEvent.location}
            >
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteEventId} onOpenChange={(open) => !open && setDeleteEventId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>행사 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  이 행사를 삭제하시겠습니까? 행사와 관련된 모든 내빈 정보가 함께 삭제됩니다.
                </p>
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="text-sm text-red-800 font-medium">
                    ⚠️ 이 작업은 되돌릴 수 없습니다.
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEventId && handleDeleteEvent(deleteEventId)}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
