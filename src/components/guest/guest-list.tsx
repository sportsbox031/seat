"use client";

import { useState } from "react";
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

    const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [guestToEdit, setGuestToEdit] = useState<Guest | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Filter Logic
    const filteredData = guests.filter((guest) => {
        // 1. Text Search
        if (searchQuery && !hangulMatch(guest.name, searchQuery) && !guest.organization.includes(searchQuery)) {
            return false;
        }
        // 2. Tab Filter
        if (filterTab === "vip") {
            return guest.type === "vip";
        }
        if (filterTab === "unassigned") {
            return !guest.seatNumber;
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
                            총 {guests.length}명 / 도착 {arrivedCount}명
                        </div>
                    </div>
                </div>

                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="이름, 소속 검색 (초성 지원)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-primary"
                    />
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
