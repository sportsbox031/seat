import { NextResponse } from 'next/server';
import { fetchGuestsByEventId, createGuestInSheet } from '@/lib/google-sheets';
import { MOCK_GUESTS } from '@/lib/mock-data';
import { Guest } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    // Google Sheets API가 설정되어 있는지 확인
    const hasGoogleSheetsConfig =
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
      process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
      process.env.GOOGLE_SHEETS_PRIVATE_KEY;

    // Google Sheets가 설정되어 있으면 시트에서 가져오기, 아니면 Mock 데이터 사용
    if (hasGoogleSheetsConfig) {
      console.log(`📊 Google Sheets에서 행사 ${eventId}의 내빈 데이터를 가져옵니다...`);
      const guests = await fetchGuestsByEventId(eventId);
      return NextResponse.json(guests);
    } else {
      console.log('⚠️ Google Sheets가 설정되지 않아 Mock 데이터를 사용합니다.');
      const mockGuests = MOCK_GUESTS.filter((g) => g.eventId === eventId);
      return NextResponse.json(mockGuests);
    }
  } catch (error: any) {
    console.error('❌ 내빈 데이터 조회 실패:', error.message);

    // 에러 발생 시 Mock 데이터 반환 (Fallback)
    console.log('🔄 Fallback: Mock 데이터를 반환합니다.');
    const { eventId } = await params;
    const mockGuests = MOCK_GUESTS.filter((g) => g.eventId === eventId);
    return NextResponse.json(mockGuests);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();
    const guest: Guest = { ...body, eventId }; // 요청 본문에 eventId 추가

    // Google Sheets API가 설정되어 있는지 확인
    const hasGoogleSheetsConfig =
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
      process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
      process.env.GOOGLE_SHEETS_PRIVATE_KEY;

    if (hasGoogleSheetsConfig) {
      console.log(`📝 행사 ${eventId}에 내빈 "${guest.name}" 추가 중...`);
      await createGuestInSheet(guest);
      return NextResponse.json({ success: true, guest }, { status: 201 });
    } else {
      console.log('⚠️ Google Sheets가 설정되지 않았습니다. Mock 모드에서는 내빈 추가가 저장되지 않습니다.');
      return NextResponse.json({ success: false, message: 'Google Sheets not configured' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ 내빈 추가 실패:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
