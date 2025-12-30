import { Guest, Seat } from '@/types';

interface SeatInfo {
    tableId: string;
    seatNumber: number;
}

/**
 * 좌석번호 파싱 (예: "A-1" -> { tableId: "A", seatNumber: 1 })
 */
export function parseSeatNumber(seatNumber: string): SeatInfo | null {
    if (!seatNumber) return null;

    // "A-1", "B-3" 형식 파싱
    const match = seatNumber.match(/^([A-Z]+)-(\d+)$/);
    if (!match) return null;

    return {
        tableId: match[1],
        seatNumber: parseInt(match[2], 10)
    };
}

/**
 * 게스트 목록에서 좌석 정보 추출
 */
export function analyzeSeatLayout(guests: Guest[]): Map<string, number> {
    const tableMaxSeats = new Map<string, number>();

    guests.forEach(guest => {
        if (!guest.seatNumber) return;

        const seatInfo = parseSeatNumber(guest.seatNumber);
        if (!seatInfo) return;

        const currentMax = tableMaxSeats.get(seatInfo.tableId) || 0;
        tableMaxSeats.set(seatInfo.tableId, Math.max(currentMax, seatInfo.seatNumber));
    });

    return tableMaxSeats;
}

/**
 * 좌석 배치도 자동 생성
 */
export function generateSeatsFromGuests(guests: Guest[]): Seat[] {
    const tableMaxSeats = analyzeSeatLayout(guests);

    if (tableMaxSeats.size === 0) {
        console.warn('좌석번호가 없는 게스트만 있습니다.');
        return [];
    }

    const seats: Seat[] = [];
    const tableIds = Array.from(tableMaxSeats.keys()).sort();

    // 테이블을 가로로 배치 (각 테이블 간 간격: 400px)
    const tableSpacing = 400;
    const seatSpacing = 80; // 좌석 간 간격
    const seatsPerRow = 4; // 한 테이블당 한 줄에 배치할 좌석 수

    tableIds.forEach((tableId, tableIndex) => {
        const maxSeats = tableMaxSeats.get(tableId) || 0;
        const tableX = 100 + (tableIndex * tableSpacing);

        // 각 좌석 배치
        for (let i = 1; i <= maxSeats; i++) {
            const seatId = `${tableId}-${i}`;
            const row = Math.floor((i - 1) / seatsPerRow);
            const col = (i - 1) % seatsPerRow;

            // 좌석 좌표 계산
            const x = tableX + (col * seatSpacing);
            const y = 100 + (row * seatSpacing);

            // 해당 좌석에 배정된 게스트 찾기
            const assignedGuest = guests.find(g => g.seatNumber === seatId);

            seats.push({
                id: seatId,
                tableGroup: tableId,
                position: { x, y },
                guestId: assignedGuest?.id || null
            });
        }
    });

    return seats;
}

/**
 * 좌석 배치 정보 요약
 */
export function getSeatLayoutSummary(guests: Guest[]): {
    totalTables: number;
    totalSeats: number;
    assignedSeats: number;
    tableDetails: Array<{ tableId: string; maxSeat: number }>;
} {
    const tableMaxSeats = analyzeSeatLayout(guests);
    const tableIds = Array.from(tableMaxSeats.keys()).sort();

    const totalSeats = Array.from(tableMaxSeats.values()).reduce((sum, max) => sum + max, 0);
    const assignedSeats = guests.filter(g => g.seatNumber).length;

    return {
        totalTables: tableMaxSeats.size,
        totalSeats,
        assignedSeats,
        tableDetails: tableIds.map(tableId => ({
            tableId,
            maxSeat: tableMaxSeats.get(tableId) || 0
        }))
    };
}

/**
 * 좌석번호 기반으로 필요한 그리드 크기 계산
 * 예: A-1, A-2, B-1, B-2, B-3 → 2행(A,B) x 3열(1,2,3)
 */
export function calculateGridSize(guests: Guest[]): { rows: number; cols: number; rowLabels: string[] } {
    const tableMaxSeats = analyzeSeatLayout(guests);

    if (tableMaxSeats.size === 0) {
        return { rows: 0, cols: 0, rowLabels: [] };
    }

    const tableIds = Array.from(tableMaxSeats.keys()).sort();
    const maxCol = Math.max(...Array.from(tableMaxSeats.values()));

    return {
        rows: tableIds.length,
        cols: maxCol,
        rowLabels: tableIds
    };
}
