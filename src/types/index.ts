export type GuestStatus = "arrived" | "not_arrived" | "cancelled";
export type GuestType = "vip" | "regular" | "staff" | "press";

export interface Guest {
    id: string;
    name: string;
    organization: string;
    position: string;
    seatNumber: string | null; // 좌석 번호 (예: A5, B12)
    status: GuestStatus; // 도착 상태: arrived(도착), not_arrived(미도착), cancelled(불참처리)
    type: GuestType; // VIP 여부 등
    biography?: string; // 특이사항 (의전 메모)
    protocolNotes?: string[]; // "휠체어", "대리수상" 등 태그
    updatedAt: string;
}

export interface Seat {
    id: string; // "T1-1", "A-5"
    tableId: string;
    label: string;
    x: number; // Grid Column or explicit X
    y: number; // Grid Row or explicit Y
    guestId: string | null;
    status: "empty" | "occupied" | "reserved" | "disabled";
}

export interface TableGroup {
    id: string;
    label: string;
    seats: Seat[];
    x: number;
    y: number;
}
