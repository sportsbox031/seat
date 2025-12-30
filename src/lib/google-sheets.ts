import { google } from 'googleapis';
import { Event, Guest } from '@/types';

// Google Sheets 인증 설정
function getGoogleSheetsClient() {
  const client_email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const private_key = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!client_email || !private_key || !spreadsheetId) {
    throw new Error(
      'Google Sheets API 환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.'
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email,
      private_key: private_key.replace(/\\n/g, '\n'), // \n 문자 처리
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'], // 읽기/쓰기
  });

  const sheets = google.sheets({ version: 'v4', auth });

  return { sheets, spreadsheetId };
}

// 행 데이터를 객체로 변환하는 헬퍼 함수
function rowToEvent(row: any[]): Event | null {
  if (!row || row.length < 8) return null;

  const [id, title, date, location, description, status, createdAt, updatedAt, seatLayout] = row;

  if (!id || !title) return null;

  // seatLayout JSON 파싱
  let parsedSeatLayout = undefined;
  if (seatLayout) {
    try {
      parsedSeatLayout = JSON.parse(seatLayout.toString());
    } catch (e) {
      console.warn(`좌석 배치도 파싱 실패 (Event ID: ${id}):`, e);
    }
  }

  return {
    id: id.toString(),
    title: title.toString(),
    date: date.toString(),
    location: location.toString(),
    description: description?.toString() || '',
    status: (status?.toString() as Event['status']) || 'upcoming',
    seatLayout: parsedSeatLayout,
    createdAt: createdAt?.toString() || new Date().toISOString(),
    updatedAt: updatedAt?.toString() || new Date().toISOString(),
  };
}

function rowToGuest(row: any[]): Guest | null {
  if (!row || row.length < 11) return null;

  const [
    id,
    eventId,
    name,
    organization,
    position,
    seatNumber,
    status,
    type,
    biography,
    protocolNotes,
    updatedAt,
  ] = row;

  if (!id || !eventId || !name) return null;

  return {
    id: id.toString(),
    eventId: eventId.toString(),
    name: name.toString(),
    organization: organization?.toString() || '',
    position: position?.toString() || '',
    seatNumber: seatNumber?.toString() || null,
    status: (status?.toString() as Guest['status']) || 'not_arrived',
    type: (type?.toString() as Guest['type']) || 'regular',
    biography: biography?.toString(),
    protocolNotes: protocolNotes ? protocolNotes.toString().split(',').map((n: string) => n.trim()) : undefined,
    updatedAt: updatedAt?.toString() || new Date().toISOString(),
  };
}

// Events 시트에서 모든 행사 가져오기
export async function fetchEventsFromSheet(): Promise<Event[]> {
  try {
    const { sheets, spreadsheetId } = getGoogleSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Events!A2:I', // 헤더 제외, 2번째 행부터 (seatLayout 포함)
    });

    const rows = response.data.values || [];
    const events = rows
      .map((row) => rowToEvent(row))
      .filter((event): event is Event => event !== null);

    console.log(`✅ Google Sheets에서 ${events.length}개의 행사를 불러왔습니다.`);
    return events;
  } catch (error: any) {
    console.error('❌ Google Sheets 행사 데이터 로드 실패:', error.message);
    throw new Error(`Google Sheets 연동 오류: ${error.message}`);
  }
}

// Guests 시트에서 모든 내빈 가져오기
export async function fetchGuestsFromSheet(): Promise<Guest[]> {
  try {
    const { sheets, spreadsheetId } = getGoogleSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Guests!A2:K', // 헤더 제외, 2번째 행부터
    });

    const rows = response.data.values || [];
    const guests = rows
      .map((row) => rowToGuest(row))
      .filter((guest): guest is Guest => guest !== null);

    console.log(`✅ Google Sheets에서 ${guests.length}명의 내빈을 불러왔습니다.`);
    return guests;
  } catch (error: any) {
    console.error('❌ Google Sheets 내빈 데이터 로드 실패:', error.message);
    throw new Error(`Google Sheets 연동 오류: ${error.message}`);
  }
}

// 특정 행사의 내빈만 가져오기
export async function fetchGuestsByEventId(eventId: string): Promise<Guest[]> {
  const allGuests = await fetchGuestsFromSheet();
  return allGuests.filter((guest) => guest.eventId === eventId);
}

// 특정 행사 가져오기
export async function fetchEventById(eventId: string): Promise<Event | null> {
  const allEvents = await fetchEventsFromSheet();
  return allEvents.find((event) => event.id === eventId) || null;
}

// ============ WRITE OPERATIONS ============

// 행사 생성
export async function createEventInSheet(event: Event): Promise<void> {
  try {
    const { sheets, spreadsheetId } = getGoogleSheetsClient();

    const row = [
      event.id,
      event.title,
      event.date,
      event.location,
      event.description || '',
      event.status,
      event.createdAt,
      event.updatedAt,
      event.seatLayout ? JSON.stringify(event.seatLayout) : '', // seatLayout JSON 저장
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Events!A:I',
      valueInputOption: 'RAW',
      requestBody: {
        values: [row],
      },
    });

    console.log(`✅ 행사 "${event.title}" 생성 완료`);
  } catch (error: any) {
    console.error('❌ 행사 생성 실패:', error.message);
    throw new Error(`Google Sheets 행사 생성 오류: ${error.message}`);
  }
}

// 행사 수정
export async function updateEventInSheet(eventId: string, updates: Partial<Event>): Promise<void> {
  try {
    const { sheets, spreadsheetId } = getGoogleSheetsClient();

    // 먼저 해당 행 찾기
    const allEvents = await fetchEventsFromSheet();
    const eventIndex = allEvents.findIndex((e) => e.id === eventId);

    if (eventIndex === -1) {
      throw new Error(`행사 ID ${eventId}를 찾을 수 없습니다.`);
    }

    const rowNumber = eventIndex + 2; // 헤더 + 0-indexed to 1-indexed
    const currentEvent = allEvents[eventIndex];
    const updatedEvent = { ...currentEvent, ...updates, updatedAt: new Date().toISOString() };

    const row = [
      updatedEvent.id,
      updatedEvent.title,
      updatedEvent.date,
      updatedEvent.location,
      updatedEvent.description || '',
      updatedEvent.status,
      updatedEvent.createdAt,
      updatedEvent.updatedAt,
      updatedEvent.seatLayout ? JSON.stringify(updatedEvent.seatLayout) : '', // seatLayout JSON 저장
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Events!A${rowNumber}:I${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [row],
      },
    });

    console.log(`✅ 행사 "${updatedEvent.title}" 수정 완료`);
  } catch (error: any) {
    console.error('❌ 행사 수정 실패:', error.message);
    throw new Error(`Google Sheets 행사 수정 오류: ${error.message}`);
  }
}

// 행사 삭제 (내빈도 함께 삭제 - Cascade Delete)
export async function deleteEventInSheet(eventId: string): Promise<void> {
  try {
    const { sheets, spreadsheetId } = getGoogleSheetsClient();

    // 1. 해당 행사의 모든 내빈 삭제
    const allGuests = await fetchGuestsFromSheet();
    const guestsToDelete = allGuests.filter((g) => g.eventId === eventId);

    console.log(`🗑️ 행사 ${eventId}의 내빈 ${guestsToDelete.length}명을 삭제합니다...`);

    // 내빈 삭제 (역순으로 삭제해야 인덱스가 안 꼬임)
    for (const guest of guestsToDelete.reverse()) {
      await deleteGuestInSheet(guest.id);
    }

    // 2. 행사 삭제
    const allEvents = await fetchEventsFromSheet();
    const eventIndex = allEvents.findIndex((e) => e.id === eventId);

    if (eventIndex === -1) {
      throw new Error(`행사 ID ${eventId}를 찾을 수 없습니다.`);
    }

    const rowNumber = eventIndex + 2; // 헤더 + 0-indexed to 1-indexed

    // 시트 ID 가져오기
    const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
    const eventsSheet = sheetMetadata.data.sheets?.find(
      (sheet) => sheet.properties?.title === 'Events'
    );
    const sheetId = eventsSheet?.properties?.sheetId;

    if (sheetId === undefined) {
      throw new Error('Events 시트를 찾을 수 없습니다.');
    }

    // 행 삭제
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowNumber - 1,
                endIndex: rowNumber,
              },
            },
          },
        ],
      },
    });

    console.log(`✅ 행사 및 관련 내빈 삭제 완료 (ID: ${eventId}, 내빈 ${guestsToDelete.length}명)`);
  } catch (error: any) {
    console.error('❌ 행사 삭제 실패:', error.message);
    throw new Error(`Google Sheets 행사 삭제 오류: ${error.message}`);
  }
}

// 내빈 생성
export async function createGuestInSheet(guest: Guest): Promise<void> {
  try {
    const { sheets, spreadsheetId } = getGoogleSheetsClient();

    const row = [
      guest.id,
      guest.eventId,
      guest.name,
      guest.organization || '',
      guest.position || '',
      guest.seatNumber || '',
      guest.status,
      guest.type,
      guest.biography || '',
      guest.protocolNotes?.join(', ') || '',
      guest.updatedAt,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Guests!A:K',
      valueInputOption: 'RAW',
      requestBody: {
        values: [row],
      },
    });

    console.log(`✅ 내빈 "${guest.name}" 생성 완료`);
  } catch (error: any) {
    console.error('❌ 내빈 생성 실패:', error.message);
    throw new Error(`Google Sheets 내빈 생성 오류: ${error.message}`);
  }
}

// 내빈 일괄 생성 (엑셀 업로드용)
export async function createGuestsInSheetBulk(guests: Guest[]): Promise<void> {
  try {
    const { sheets, spreadsheetId } = getGoogleSheetsClient();

    const rows = guests.map(guest => [
      guest.id,
      guest.eventId,
      guest.name,
      guest.organization || '',
      guest.position || '',
      guest.seatNumber || '',
      guest.status,
      guest.type,
      guest.biography || '',
      guest.protocolNotes?.join(', ') || '',
      guest.updatedAt,
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Guests!A:K',
      valueInputOption: 'RAW',
      requestBody: {
        values: rows,
      },
    });

    console.log(`✅ ${guests.length}명의 내빈 일괄 생성 완료`);
  } catch (error: any) {
    console.error('❌ 내빈 일괄 생성 실패:', error.message);
    throw new Error(`Google Sheets 내빈 일괄 생성 오류: ${error.message}`);
  }
}

// 내빈 수정
export async function updateGuestInSheet(guestId: string, updates: Partial<Guest>): Promise<void> {
  try {
    const { sheets, spreadsheetId } = getGoogleSheetsClient();

    // 먼저 해당 행 찾기
    const allGuests = await fetchGuestsFromSheet();
    const guestIndex = allGuests.findIndex((g) => g.id === guestId);

    if (guestIndex === -1) {
      throw new Error(`내빈 ID ${guestId}를 찾을 수 없습니다.`);
    }

    const rowNumber = guestIndex + 2; // 헤더 + 0-indexed to 1-indexed
    const currentGuest = allGuests[guestIndex];
    const updatedGuest = { ...currentGuest, ...updates, updatedAt: new Date().toISOString() };

    const row = [
      updatedGuest.id,
      updatedGuest.eventId,
      updatedGuest.name,
      updatedGuest.organization || '',
      updatedGuest.position || '',
      updatedGuest.seatNumber || '',
      updatedGuest.status,
      updatedGuest.type,
      updatedGuest.biography || '',
      updatedGuest.protocolNotes?.join(', ') || '',
      updatedGuest.updatedAt,
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Guests!A${rowNumber}:K${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [row],
      },
    });

    console.log(`✅ 내빈 "${updatedGuest.name}" 수정 완료`);
  } catch (error: any) {
    console.error('❌ 내빈 수정 실패:', error.message);
    throw new Error(`Google Sheets 내빈 수정 오류: ${error.message}`);
  }
}

// 내빈 삭제
export async function deleteGuestInSheet(guestId: string): Promise<void> {
  try {
    const { sheets, spreadsheetId } = getGoogleSheetsClient();

    // 먼저 해당 행 찾기
    const allGuests = await fetchGuestsFromSheet();
    const guestIndex = allGuests.findIndex((g) => g.id === guestId);

    if (guestIndex === -1) {
      throw new Error(`내빈 ID ${guestId}를 찾을 수 없습니다.`);
    }

    const rowNumber = guestIndex + 2; // 헤더 + 0-indexed to 1-indexed

    // 시트 ID 가져오기
    const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
    const guestsSheet = sheetMetadata.data.sheets?.find(
      (sheet) => sheet.properties?.title === 'Guests'
    );
    const sheetId = guestsSheet?.properties?.sheetId;

    if (sheetId === undefined) {
      throw new Error('Guests 시트를 찾을 수 없습니다.');
    }

    // 행 삭제
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowNumber - 1,
                endIndex: rowNumber,
              },
            },
          },
        ],
      },
    });

    console.log(`✅ 내빈 삭제 완료 (ID: ${guestId})`);
  } catch (error: any) {
    console.error('❌ 내빈 삭제 실패:', error.message);
    throw new Error(`Google Sheets 내빈 삭제 오류: ${error.message}`);
  }
}
