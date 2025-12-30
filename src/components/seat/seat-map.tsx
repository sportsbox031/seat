"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, Star, Settings2, X, Search, Plus, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ProtocolModal } from "@/components/guest/protocol-modal";
import { EditGuestModal } from "@/components/guest/edit-guest-modal";
import { cn } from "@/lib/utils";
import { hangulMatch } from "@/lib/hangul";
import type { Guest, GuestStatus, Seat } from "@/types";

interface TheaterSeat {
    row: string;
    col: number;
    id: string;
    guestId: string | null;
    disabled?: boolean;
}

interface SeatMapProps {
    guests: Guest[];
    onAssignSeat: (guestId: string, seatNumber: string | null) => void;
    onUpdateGuestStatus: (guestId: string, status: GuestStatus, removeSeat?: boolean) => void;
    onUpdateGuest: (guest: Guest) => void;
    onDeleteGuest: (guestId: string) => void;
    draggedGuest: Guest | null;
    importedGridSize?: { rows: number; cols: number; rowLabels: string[] } | null;
}

export function SeatMap({ guests, onAssignSeat, onUpdateGuestStatus, onUpdateGuest, onDeleteGuest, draggedGuest, importedGridSize }: SeatMapProps) {
    const [rows, setRows] = useState(10);
    const [cols, setCols] = useState(15);
    const [seats, setSeats] = useState<TheaterSeat[]>([]);
    const [selectedSeat, setSelectedSeat] = useState<TheaterSeat | null>(null);
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [dropTargetSeatId, setDropTargetSeatId] = useState<string | null>(null);

    // 내빈 상세정보 모달 상태
    const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
    const [isProtocolModalOpen, setIsProtocolModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [guestToEdit, setGuestToEdit] = useState<Guest | null>(null);

    // importedGridSize prop 변경 시 자동으로 그리드 생성
    useEffect(() => {
        if (!importedGridSize) return;

        const { rows: gridRows, cols: gridCols, rowLabels } = importedGridSize;

        // 행/열 설정 업데이트
        setRows(gridRows);
        setCols(gridCols);

        // 그리드 생성
        const newSeats: TheaterSeat[] = [];

        for (let r = 0; r < gridRows; r++) {
            for (let c = 1; c <= gridCols; c++) {
                const rowLabel = rowLabels[r];
                const seatId = `${rowLabel}${c}`;

                // 게스트의 좌석번호와 매칭 (하이픈 제거)
                const assignedGuest = guests.find(g => g.seatNumber?.replace('-', '') === seatId);

                newSeats.push({
                    row: rowLabel,
                    col: c,
                    id: seatId,
                    guestId: assignedGuest?.id || null,
                    disabled: false
                });
            }
        }

        setSeats(newSeats);
    }, [importedGridSize, guests]);

    // guests prop 변경 시 seats 동기화
    useEffect(() => {
        if (seats.length === 0) return;

        setSeats(prevSeats =>
            prevSeats.map(seat => {
                // 현재 좌석에 배정된 게스트 찾기
                const currentGuest = seat.guestId ? guests.find(g => g.id === seat.guestId) : null;

                // 좌석 ID를 게스트의 seatNumber와 비교 (하이픈 제거)
                const normalizedSeatId = seat.id;

                // 게스트가 좌석을 잃었다면
                if (currentGuest) {
                    const guestSeatNormalized = currentGuest.seatNumber?.replace('-', '');
                    if (guestSeatNormalized !== normalizedSeatId) {
                        return { ...seat, guestId: null };
                    }
                }

                // 이 좌석 번호를 가진 게스트 찾기
                const assignedGuest = guests.find(g => {
                    const guestSeatNormalized = g.seatNumber?.replace('-', '');
                    return guestSeatNormalized === normalizedSeatId;
                });

                if (assignedGuest && seat.guestId !== assignedGuest.id) {
                    return { ...seat, guestId: assignedGuest.id };
                }

                return seat;
            })
        );
    }, [guests, seats.length]);

    // Generate seats based on rows and cols
    const generateSeats = (rowCount: number, colCount: number) => {
        const newSeats: TheaterSeat[] = [];
        const rowLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

        for (let r = 0; r < rowCount; r++) {
            for (let c = 1; c <= colCount; c++) {
                const seatId = `${rowLabels[r] || `R${r + 1}`}${c}`;
                // 기존에 해당 좌석에 배정된 게스트 찾기
                const assignedGuest = guests.find(g => g.seatNumber === seatId);

                newSeats.push({
                    row: rowLabels[r] || `R${r + 1}`,
                    col: c,
                    id: seatId,
                    guestId: assignedGuest?.id || null,
                    disabled: false
                });
            }
        }
        setSeats(newSeats);
    };

    const handleApplyLayout = () => {
        generateSeats(rows, cols);
    };

    const getSeatGuest = (seat: TheaterSeat) => {
        if (!seat.guestId) return null;
        return guests.find(g => g.id === seat.guestId);
    };

    // Get assigned guest IDs
    const assignedGuestIds = new Set(seats.filter(s => s.guestId).map(s => s.guestId));

    // Filter available guests (not already assigned)
    const availableGuests = guests.filter(g => {
        // If this is the currently selected seat's guest, include them (for reassignment)
        if (selectedSeat?.guestId === g.id) return true;
        // Otherwise, only show unassigned guests or cancelled guests
        return !assignedGuestIds.has(g.id) || g.status === 'cancelled';
    }).filter(g => {
        // Search filter
        if (!searchQuery) return true;
        return hangulMatch(g.name, searchQuery) ||
               g.organization.includes(searchQuery) ||
               g.position.includes(searchQuery);
    });

    // Stats - 좌석에 배정된 내빈만 카운트
    const assignedGuests = guests.filter(g => g.seatNumber);
    const totalGuests = assignedGuests.length;
    const attended = assignedGuests.filter(g => g.status === 'arrived').length;
    const vips = assignedGuests.filter(g => g.type === 'vip').length;
    const vipAttended = assignedGuests.filter(g => g.type === 'vip' && g.status === 'arrived').length;

    const handleSeatClick = (seat: TheaterSeat) => {
        if (seat.disabled) return;

        const guest = getSeatGuest(seat);

        if (guest) {
            // 이미 배정된 좌석 - 내빈 상세정보 표시
            setSelectedGuest(guest);
            setIsProtocolModalOpen(true);
        } else {
            // 빈 좌석 - 배정 다이얼로그 표시
            setSelectedSeat(seat);
            setSearchQuery("");
            setIsAssignDialogOpen(true);
        }
    };

    const handleAssignGuest = (guest: Guest) => {
        if (!selectedSeat) return;

        // 이전에 이 게스트가 배정되어 있던 좌석의 guestId를 null로 설정
        setSeats(prevSeats =>
            prevSeats.map(s =>
                s.guestId === guest.id ? { ...s, guestId: null } : s
            )
        );

        // 새 좌석에 게스트 배정
        setSeats(prevSeats =>
            prevSeats.map(s =>
                s.id === selectedSeat.id
                    ? { ...s, guestId: guest.id }
                    : s
            )
        );

        // 게스트의 seatNumber 업데이트 (부모 컴포넌트로 전달)
        onAssignSeat(guest.id, selectedSeat.id);

        setIsAssignDialogOpen(false);
        setSelectedSeat(null);
    };

    const handleUnassignSeat = () => {
        if (!selectedSeat) return;
        const currentGuest = getSeatGuest(selectedSeat);

        // Remove seat assignment
        setSeats(prevSeats =>
            prevSeats.map(s =>
                s.id === selectedSeat.id
                    ? { ...s, guestId: null }
                    : s
            )
        );

        // Update guest's seatNumber to null (부모 컴포넌트로 전달)
        if (currentGuest) {
            onAssignSeat(currentGuest.id, null);
        }

        setIsAssignDialogOpen(false);
        setSelectedSeat(null);
    };

    const handleEditGuest = (guest: Guest) => {
        setGuestToEdit(guest);
        setIsEditModalOpen(true);
    };

    return (
        <div className="h-full w-full relative bg-slate-100 overflow-auto">
            {/* Stats Overlay */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 w-64">
                <Card className="shadow-lg border-none bg-white/90 backdrop-blur">
                    <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">실시간 참석 현황</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="flex justify-between items-end mb-2">
                            <div className="flex items-center gap-2">
                                <UserCheck className="w-5 h-5 text-green-600" />
                                <span className="text-2xl font-bold text-slate-800">{attended}</span>
                                <span className="text-sm text-muted-foreground">/ {totalGuests}</span>
                            </div>
                            <Badge variant={totalGuests > 0 && attended / totalGuests > 0.8 ? "default" : "secondary"}>
                                {totalGuests > 0 ? Math.round((attended / totalGuests) * 100) : 0}%
                            </Badge>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="flex items-center gap-1 text-amber-600 font-medium">
                                    <Star className="w-3 h-3 fill-current" /> VIP 도착
                                </span>
                                <span>{vipAttended} / {vips}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-400 transition-all duration-500"
                                    style={{ width: `${vips > 0 ? (vipAttended / vips) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Layout Configuration */}
            <div className="absolute top-4 left-4 z-10">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="bg-white/90 backdrop-blur shadow-lg">
                            <Settings2 className="w-4 h-4 mr-2" />
                            좌석 배치 설정
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <h4 className="font-medium text-sm">극장식 좌석 배치</h4>
                                <p className="text-xs text-muted-foreground">
                                    가로 세로 줄 수를 설정하여 좌석을 생성합니다.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="rows">세로 줄 수 (행)</Label>
                                    <div className="flex gap-2 items-center">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setRows(Math.max(1, rows - 1))}
                                            disabled={rows <= 1}
                                        >
                                            <Minus className="w-4 h-4" />
                                        </Button>
                                        <Input
                                            id="rows"
                                            type="number"
                                            min="1"
                                            max="26"
                                            value={rows}
                                            onChange={(e) => setRows(Math.min(26, Math.max(1, parseInt(e.target.value) || 1)))}
                                            className="text-center"
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setRows(Math.min(26, rows + 1))}
                                            disabled={rows >= 26}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cols">가로 줄 수 (열)</Label>
                                    <div className="flex gap-2 items-center">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setCols(Math.max(1, cols - 1))}
                                            disabled={cols <= 1}
                                        >
                                            <Minus className="w-4 h-4" />
                                        </Button>
                                        <Input
                                            id="cols"
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={cols}
                                            onChange={(e) => setCols(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                                            className="text-center"
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setCols(Math.min(30, cols + 1))}
                                            disabled={cols >= 30}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <Button onClick={handleApplyLayout} className="w-full">
                                좌석 배치 생성
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                총 좌석 수: {rows * cols}석
                            </p>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Theater Layout */}
            <div className="flex flex-col items-center justify-start pt-32 pb-20 min-h-full">
                {seats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                        <Settings2 className="w-12 h-12" />
                        <p className="text-sm">좌석 배치 설정을 클릭하여 좌석을 생성하세요</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {/* Screen */}
                        <div className="mb-8 flex justify-center">
                            <div className="w-full max-w-4xl h-2 bg-slate-800 rounded-t-3xl shadow-lg relative">
                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-slate-500 font-medium">
                                    STAGE / 무대
                                </span>
                            </div>
                        </div>

                        {/* Seats Grid */}
                        {Array.from({ length: rows }).map((_, rowIdx) => {
                            const rowLabel = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[rowIdx] || `R${rowIdx + 1}`;
                            const rowSeats = seats.filter(s => s.row === rowLabel);

                            return (
                                <div key={rowLabel} className="flex items-center gap-2">
                                    {/* Row Label */}
                                    <div className="w-8 text-center font-bold text-slate-600 text-sm">
                                        {rowLabel}
                                    </div>

                                    {/* Seats */}
                                    <div className="flex gap-1">
                                        {rowSeats.map((seat) => {
                                            const guest = getSeatGuest(seat);
                                            const isVip = guest?.type === 'vip';
                                            const isArrived = guest?.status === 'arrived';
                                            const isOccupied = !!guest;
                                            const isDropTarget = dropTargetSeatId === seat.id;

                                            return (
                                                <button
                                                    key={seat.id}
                                                    disabled={seat.disabled}
                                                    onClick={() => handleSeatClick(seat)}
                                                    onDragOver={(e) => {
                                                        if (draggedGuest) {
                                                            e.preventDefault();
                                                            setDropTargetSeatId(seat.id);
                                                        }
                                                    }}
                                                    onDragLeave={() => {
                                                        setDropTargetSeatId(null);
                                                    }}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        setDropTargetSeatId(null);
                                                        if (draggedGuest) {
                                                            // 이전 좌석에서 제거
                                                            setSeats(prevSeats =>
                                                                prevSeats.map(s =>
                                                                    s.guestId === draggedGuest.id ? { ...s, guestId: null } : s
                                                                )
                                                            );
                                                            // 새 좌석에 배정
                                                            setSeats(prevSeats =>
                                                                prevSeats.map(s =>
                                                                    s.id === seat.id ? { ...s, guestId: draggedGuest.id } : s
                                                                )
                                                            );
                                                            // 부모 컴포넌트에 알림
                                                            onAssignSeat(draggedGuest.id, seat.id);
                                                        }
                                                    }}
                                                    className={cn(
                                                        "w-9 h-9 rounded-md border-2 text-xs font-medium transition-all",
                                                        "hover:scale-110 hover:shadow-md cursor-pointer",
                                                        seat.disabled && "opacity-30 cursor-not-allowed",
                                                        !seat.disabled && !isOccupied && "bg-slate-200 border-slate-300 hover:bg-slate-300",
                                                        isOccupied && isArrived && "bg-emerald-500 border-emerald-500 text-white",
                                                        isOccupied && !isArrived && "bg-slate-100 border-slate-400",
                                                        isVip && "border-amber-400 ring-2 ring-amber-200",
                                                        isDropTarget && draggedGuest && "ring-4 ring-blue-400 scale-110 bg-blue-100"
                                                    )}
                                                    title={guest ? `${guest.name} (${guest.organization})` : seat.id}
                                                >
                                                    {seat.col}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Row Label (Right) */}
                                    <div className="w-8 text-center font-bold text-slate-600 text-sm">
                                        {rowLabel}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-10 p-3 bg-white/90 backdrop-blur rounded-md shadow-lg flex gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded border-2 border-emerald-500 bg-emerald-500" />
                    <span>도착</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded border-2 border-slate-400 bg-slate-100" />
                    <span>미도착</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded border-2 border-slate-300 bg-slate-200" />
                    <span>빈 좌석</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded border-2 border-amber-400 ring-2 ring-amber-200" />
                    <span>VIP</span>
                </div>
            </div>

            {/* Guest Assignment Dialog (빈 좌석 클릭 시) */}
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>좌석 배정 - {selectedSeat?.id}</DialogTitle>
                        <DialogDescription>
                            좌석에 배정할 내빈을 선택하세요.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="이름, 소속, 직책 검색 (초성 지원)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <div className="flex-1 overflow-auto border rounded-lg">
                        {availableGuests.length === 0 ? (
                            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                                {searchQuery ? "검색 결과가 없습니다." : "배정 가능한 내빈이 없습니다."}
                            </div>
                        ) : (
                            <div className="divide-y">
                                {availableGuests.map((guest) => (
                                    <button
                                        key={guest.id}
                                        onClick={() => handleAssignGuest(guest)}
                                        className="w-full p-3 hover:bg-slate-50 transition-colors text-left flex items-center justify-between group"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{guest.name}</span>
                                                {guest.type === 'vip' && (
                                                    <Badge variant="outline" className="text-amber-600 border-amber-400">
                                                        <Star className="w-3 h-3 mr-1 fill-current" />
                                                        VIP
                                                    </Badge>
                                                )}
                                                <Badge variant={
                                                    guest.status === 'arrived' ? 'default' :
                                                    guest.status === 'cancelled' ? 'destructive' :
                                                    'secondary'
                                                } className={guest.status === 'arrived' ? 'bg-emerald-500' : ''}>
                                                    {guest.status === 'arrived' ? '도착' :
                                                     guest.status === 'cancelled' ? '불참' :
                                                     '미도착'}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {guest.organization} · {guest.position}
                                            </p>
                                            {guest.category && (
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {guest.category}
                                                </p>
                                            )}
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-sm text-primary font-medium">
                                            선택 →
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Protocol Modal (배정된 좌석 클릭 시) */}
            <ProtocolModal
                guest={selectedGuest}
                open={isProtocolModalOpen}
                onOpenChange={setIsProtocolModalOpen}
                onEditGuest={handleEditGuest}
                onUpdateStatus={onUpdateGuestStatus}
                onDeleteGuest={onDeleteGuest}
            />

            {/* Edit Guest Modal */}
            <EditGuestModal
                guest={guestToEdit}
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                onSave={onUpdateGuest}
            />
        </div>
    );
}
