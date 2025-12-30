import * as XLSX from 'xlsx';
import { Guest } from '@/types';

/**
 * 내빈 리스트 엑셀 양식 다운로드
 */
export function downloadGuestTemplate() {
    // 샘플 데이터가 포함된 양식
    const templateData = [
        {
            '이름': '홍길동',
            '소속': '경기도청',
            '직함': '국장',
            '구분': 'VIP',
            '좌석번호': 'A-1',
            '내빈정보': '경기도청 총무국장을 역임하고 있으며...',
            '의전특이사항': '휠체어 사용|좌석 앞쪽 배치 필요'
        },
        {
            '이름': '김철수',
            '소속': '수원시청',
            '직함': '과장',
            '구분': '일반',
            '좌석번호': 'B-3',
            '내빈정보': '',
            '의전특이사항': ''
        }
    ];

    // 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // 컬럼 너비 설정
    worksheet['!cols'] = [
        { wch: 12 },  // 이름
        { wch: 20 },  // 소속
        { wch: 15 },  // 직함
        { wch: 10 },  // 구분
        { wch: 12 },  // 좌석번호
        { wch: 40 },  // 내빈정보
        { wch: 40 },  // 의전특이사항
    ];

    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '내빈리스트');

    // 설명 시트 추가
    const instructions = [
        { '항목': '이름', '필수여부': '필수', '설명': '내빈 성명' },
        { '항목': '소속', '필수여부': '필수', '설명': '소속 기관/단체명' },
        { '항목': '직함', '필수여부': '선택', '설명': '직책 또는 직함' },
        { '항목': '구분', '필수여부': '선택', '설명': 'VIP 또는 일반 (기본값: 일반)' },
        { '항목': '좌석번호', '필수여부': '선택', '설명': '배정할 좌석번호 (예: A-1, B-3)' },
        { '항목': '내빈정보', '필수여부': '선택', '설명': '내빈 약력 또는 소개' },
        { '항목': '의전특이사항', '필수여부': '선택', '설명': '여러 항목은 | 기호로 구분 (예: 항목1|항목2)' },
    ];
    const instructionSheet = XLSX.utils.json_to_sheet(instructions);
    instructionSheet['!cols'] = [
        { wch: 15 },
        { wch: 10 },
        { wch: 50 },
    ];
    XLSX.utils.book_append_sheet(workbook, instructionSheet, '작성가이드');

    // 파일 다운로드
    XLSX.writeFile(workbook, 'G-Protocol_내빈리스트_양식.xlsx');
}

/**
 * 엑셀 파일에서 내빈 데이터 파싱
 */
export function parseGuestExcel(file: File): Promise<Guest[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                // 첫 번째 시트 읽기
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // JSON으로 변환
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                // Guest 타입으로 변환
                const guests: Guest[] = jsonData.map((row: any, index: number) => {
                    const protocolNotesRaw = row['의전특이사항'] || '';
                    const protocolNotes = protocolNotesRaw
                        ? protocolNotesRaw.split('|').map((note: string) => note.trim()).filter(Boolean)
                        : [];

                    // VIP 구분 파싱 (대소문자 구분 없이)
                    const guestType = row['구분'] || row['VIP 여부'] || '';
                    const isVip = guestType.toString().toUpperCase().includes('VIP');

                    const guest: Guest = {
                        id: `imported-${Date.now()}-${index}`,
                        name: row['이름'] || '',
                        organization: row['소속'] || '',
                        position: row['직함'] || '',
                        type: isVip ? 'vip' : 'regular',
                        status: 'not_arrived',
                        seatNumber: row['좌석번호'] || null,
                        biography: row['내빈정보'] || undefined,
                        protocolNotes: protocolNotes.length > 0 ? protocolNotes : undefined,
                        updatedAt: new Date().toISOString(),
                    };

                    return guest;
                });

                // 이름이 없는 행 제거
                const validGuests = guests.filter(guest => guest.name.trim() !== '');

                resolve(validGuests);
            } catch (error) {
                reject(new Error('엑셀 파일 파싱 중 오류가 발생했습니다: ' + (error as Error).message));
            }
        };

        reader.onerror = () => {
            reject(new Error('파일 읽기 중 오류가 발생했습니다.'));
        };

        reader.readAsArrayBuffer(file);
    });
}

/**
 * 현재 내빈 리스트를 엑셀로 내보내기
 */
export function exportGuestsToExcel(guests: Guest[], filename: string = 'G-Protocol_내빈리스트.xlsx') {
    const exportData = guests.map(guest => ({
        '이름': guest.name,
        '소속': guest.organization,
        '직함': guest.position,
        '구분': guest.type === 'vip' ? 'VIP' : '일반',
        '좌석번호': guest.seatNumber || '',
        '상태': guest.status === 'arrived' ? '도착' : guest.status === 'cancelled' ? '불참' : '미도착',
        '내빈정보': guest.biography || '',
        '의전특이사항': guest.protocolNotes ? guest.protocolNotes.join(' | ') : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    worksheet['!cols'] = [
        { wch: 12 },  // 이름
        { wch: 20 },  // 소속
        { wch: 15 },  // 직함
        { wch: 10 },  // 구분
        { wch: 12 },  // 좌석번호
        { wch: 10 },  // 상태
        { wch: 40 },  // 내빈정보
        { wch: 40 },  // 의전특이사항
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '내빈리스트');

    XLSX.writeFile(workbook, filename);
}
