"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/guest/data-table";
import { columns } from "@/components/guest/columns";
import { hangulMatch } from "@/lib/hangul";
import { Guest, GuestStatus } from "@/types";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtocolModal } from "@/components/guest/protocol-modal";
import { EditGuestModal } from "@/components/guest/edit-guest-modal";

interface GuestListProps {
    guests: Guest[];
    onUpdateGuestStatus: (guestId: string, status: GuestStatus, removeSeat?: boolean) => void;
    onUpdateGuest: (guest: Guest) => void;
    onAddGuest: (newGuest: Omit<Guest, 'id' | 'updatedAt'>) => void;
    onDeleteGuest: (guestId: string) => void;
    onDragStart: (guest: Guest) => void;
    onDragEnd: () => void;
}

export function GuestList({ guests, onUpdateGuestStatus, onUpdateGuest, onAddGuest, onDeleteGuest, onDragStart, onDragEnd }: GuestListProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterTab, setFilterTab] = useState("all"); // all, vip, unassigned

    // 복수 필터 상태
    const [filters, setFilters] = useState({
        vipOnly: false,
        unassignedOnly: false,
        notArrivedOnly: false,
    });

    const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [guestToEdit, setGuestToEdit] = useState<Guest | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // 검색창 ref (키보드 단축키용)
    const searchInputRef = useRef<HTMLInputElement>(null);

    // guests prop 변경 시 selectedGuest와 guestToEdit 동기화
    useEffect(() => {
        if (selectedGuest) {
            const updatedGuest = guests.find(g => g.id === selectedGuest.id);
            if (updatedGuest) {
                setSelectedGuest(updatedGuest);
            }
        }
        if (guestToEdit) {
            const updatedGuest = guests.find(g => g.id === guestToEdit.id);
            if (updatedGuest) {
                setGuestToEdit(updatedGuest);
            }
        }
    }, [guests]);

    // 키보드 단축키 핸들러
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // / 키: 검색창 포커스
            if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
                // input, textarea에서는 무시
                const target = e.target as HTMLElement;
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                    return;
                }
                e.preventDefault();
                searchInputRef.current?.focus();
            }

            // Esc 키: 검색 초기화
            if (e.key === 'Escape') {
                if (searchQuery) {
                    setSearchQuery('');
                    searchInputRef.current?.blur();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [searchQuery]);

    // Filter Logic - 강화된 검색 및 복수 필터
    const filteredData = guests.filter((guest) => {
        // 1. Text Search - 이름, 소속, 직책, 좌석번호 모두 검색
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesName = hangulMatch(guest.name, searchQuery);
            const matchesOrg = guest.organization?.toLowerCase().includes(query);
            const matchesPosition = guest.position?.toLowerCase().includes(query);
            const matchesSeat = guest.seatNumber?.toLowerCase().includes(query);

            if (!matchesName && !matchesOrg && !matchesPosition && !matchesSeat) {
                return false;
            }
        }

        // 2. 복수 필터 적용
        if (filters.vipOnly && guest.type !== "vip") {
            return false;
        }
        if (filters.unassignedOnly && guest.seatNumber) {
            return false;
        }
        if (filters.notArrivedOnly && guest.status === "arrived") {
            return false;
        }

        // 3. 기존 Tab Filter (복수 필터와 병행)
        if (filterTab === "vip" && guest.type !== "vip") {
            return false;
        }
        if (filterTab === "unassigned" && guest.seatNumber) {
            return false;
        }

        return true;
    });

    const handleRowClick = (guest: Guest) => {
        setSelectedGuest(guest);
        setIsModalOpen(true);
    };

    const handleEditGuest = (guest: Guest) => {
        setGuestToEdit(guest);
        setIsEditModalOpen(true);
    };

    const arrivedCount = guests.filter(g => g.status === 'arrived').length;
    const filteredArrivedCount = filteredData.filter(g => g.status === 'arrived').length;

    const handleAddNewGuest = (newGuestData: Omit<Guest, 'id' | 'updatedAt'>) => {
        onAddGuest(newGuestData);
        setIsAddModalOpen(false);
    };

    return (
        <div className="h-full w-full flex flex-col bg-background border-r">
            <div className="p-4 border-b space-y-4 bg-white">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight text-primary">내빈 리스트</h2>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setIsAddModalOpen(true)}
                            size="sm"
                            className="gap-1"
                        >
                            <Plus className="w-4 h-4" />
                            내빈 추가
                        </Button>
                        <div className="text-sm font-medium text-muted-foreground bg-slate-100 px-3 py-1 rounded-full">
                            {searchQuery || filters.vipOnly || filters.unassignedOnly || filters.notArrivedOnly ? (
                                <>
                                    필터링: {filteredData.length}명 / 전체 {guests.length}명
                                </>
                            ) : (
                                <>
                                    총 {guests.length}명 / 도착 {arrivedCount}명
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        ref={searchInputRef}
                        placeholder="이름, 소속, 직책, 좌석번호 검색 (초성 지원, / 키로 포커스)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-primary"
                    />
                </div>

                {/* Advanced Filters */}
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground">필터:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.vipOnly}
                            onChange={(e) => setFilters({ ...filters, vipOnly: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-xs font-medium text-slate-700">VIP만</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.unassignedOnly}
                            onChange={(e) => setFilters({ ...filters, unassignedOnly: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs font-medium text-slate-700">미배정만</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.notArrivedOnly}
                            onChange={(e) => setFilters({ ...filters, notArrivedOnly: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-xs font-medium text-slate-700">미도착만</span>
                    </label>
                    {(filters.vipOnly || filters.unassignedOnly || filters.notArrivedOnly) && (
                        <button
                            onClick={() => setFilters({ vipOnly: false, unassignedOnly: false, notArrivedOnly: false })}
                            className="text-xs text-blue-600 hover:text-blue-700 underline ml-2"
                        >
                            필터 초기화
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <Tabs defaultValue="all" onValueChange={setFilterTab}>
                    <TabsList className="w-full grid grid-cols-3">
                        <TabsTrigger value="all">전체</TabsTrigger>
                        <TabsTrigger value="vip" className="data-[state=active]:text-amber-600">VIP</TabsTrigger>
                        <TabsTrigger value="unassigned">미배정</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="flex-1 overflow-hidden p-2 bg-slate-50/50">
                <DataTable
                    columns={columns}
                    data={filteredData}
                    onRowClick={handleRowClick}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                />
            </div>

            <ProtocolModal
                guest={selectedGuest}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onEditGuest={handleEditGuest}
                onUpdateStatus={onUpdateGuestStatus}
                onDeleteGuest={onDeleteGuest}
            />

            <EditGuestModal
                guest={guestToEdit}
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                onSave={onUpdateGuest}
            />

            {/* 새 내빈 추가 모달 */}
            <EditGuestModal
                guest={null}
                open={isAddModalOpen}
                onOpenChange={setIsAddModalOpen}
                onSave={handleAddNewGuest}
            />
        </div>
    );
}
