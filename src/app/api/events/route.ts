import { NextResponse } from 'next/server';
import { fetchEventsFromSheet, createEventInSheet } from '@/lib/google-sheets';
import { MOCK_EVENTS } from '@/lib/mock-data';
import { Event } from '@/types';

export async function GET() {
  try {
    // Google Sheets API가 설정되어 있는지 확인
    const hasGoogleSheetsConfig =
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
      process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
      process.env.GOOGLE_SHEETS_PRIVATE_KEY;

    // Google Sheets가 설정되어 있으면 시트에서 가져오기, 아니면 Mock 데이터 사용
    if (hasGoogleSheetsConfig) {
      console.log('📊 Google Sheets에서 행사 데이터를 가져옵니다...');
      const events = await fetchEventsFromSheet();
      return NextResponse.json(events);
    } else {
      console.log('⚠️ Google Sheets가 설정되지 않아 Mock 데이터를 사용합니다.');
      return NextResponse.json(MOCK_EVENTS);
    }
  } catch (error: any) {
    console.error('❌ 행사 데이터 조회 실패:', error.message);

    // 에러 발생 시 Mock 데이터 반환 (Fallback)
    console.log('🔄 Fallback: Mock 데이터를 반환합니다.');
    return NextResponse.json(MOCK_EVENTS);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const event: Event = body;

    // Google Sheets API가 설정되어 있는지 확인
    const hasGoogleSheetsConfig =
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
      process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
      process.env.GOOGLE_SHEETS_PRIVATE_KEY;

    if (hasGoogleSheetsConfig) {
      console.log(`📝 행사 "${event.title}" 생성 중...`);
      await createEventInSheet(event);
      return NextResponse.json({ success: true, event }, { status: 201 });
    } else {
      console.log('⚠️ Google Sheets가 설정되지 않았습니다. Mock 모드에서는 행사 생성이 저장되지 않습니다.');
      return NextResponse.json({ success: false, message: 'Google Sheets not configured' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ 행사 생성 실패:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
