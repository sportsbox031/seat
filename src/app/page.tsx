"use client";

import { useState, useRef, useEffect } from "react";
import { GuestList } from "@/components/guest/guest-list";
import { SeatMap } from "@/components/seat/seat-map";
import { UploadDialog } from "@/components/dashboard/upload-dialog";
import { Button } from "@/components/ui/button";
import { MOCK_GUESTS } from "@/lib/mock-data";
import type { Guest, GuestStatus, Seat } from "@/types";
import { GripVertical, Download } from "lucide-react";
import { exportGuestsToExcel } from "@/lib/excel-utils";

export default function DashboardPage() {
  // 공통 게스트 상태 관리
  const [guests, setGuests] = useState<Guest[]>(MOCK_GUESTS);
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
    setGuests(prevGuests =>
      prevGuests.map(guest => {
        if (guest.id === guestId) {
          const updatedGuest = {
            ...guest,
            status,
            updatedAt: new Date().toISOString(),
          };

          // 불참 처리 시 좌석 삭제 옵션 처리
          if (status === "cancelled" && removeSeat) {
            updatedGuest.seatNumber = null;
          }

          return updatedGuest;
        }
        return guest;
      })
    );
  };

  // 게스트 정보 업데이트 핸들러
  const handleUpdateGuest = (updatedGuest: Guest) => {
    setGuests(prevGuests =>
      prevGuests.map(guest =>
        guest.id === updatedGuest.id
          ? { ...updatedGuest, updatedAt: new Date().toISOString() }
          : guest
      )
    );
  };

  // 새 게스트 추가 핸들러
  const handleAddGuest = (newGuest: Omit<Guest, 'id' | 'updatedAt'>) => {
    const guest: Guest = {
      ...newGuest,
      id: `guest-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    setGuests(prevGuests => [...prevGuests, guest]);
  };

  // 게스트에 좌석 배정 핸들러
  const handleAssignSeat = (guestId: string, seatNumber: string | null) => {
    setGuests(prevGuests =>
      prevGuests.map(guest =>
        guest.id === guestId
          ? { ...guest, seatNumber, updatedAt: new Date().toISOString() }
          : guest
      )
    );
  };

  // 게스트 삭제 핸들러
  const handleDeleteGuest = (guestId: string) => {
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

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header Area */}
      <header className="h-14 border-b flex items-center justify-between px-6 bg-white shadow-sm z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-primary tracking-tight">G-Protocol</h1>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            v1.2
          </span>
        </div>

        <div className="flex items-center gap-4">
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
    </div>
  );
}
