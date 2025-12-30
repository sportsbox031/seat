import { NextResponse } from 'next/server';
import { fetchEventById, updateEventInSheet, deleteEventInSheet } from '@/lib/google-sheets';
import { Event } from '@/types';

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

    if (hasGoogleSheetsConfig) {
      console.log(`📊 행사 ${eventId} 조회 중...`);
      const event = await fetchEventById(eventId);

      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      return NextResponse.json(event);
    } else {
      console.log('⚠️ Google Sheets가 설정되지 않았습니다.');
      return NextResponse.json({ error: 'Google Sheets not configured' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ 행사 조회 실패:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();
    const updates: Partial<Event> = body;

    // Google Sheets API가 설정되어 있는지 확인
    const hasGoogleSheetsConfig =
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
      process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
      process.env.GOOGLE_SHEETS_PRIVATE_KEY;

    if (hasGoogleSheetsConfig) {
      console.log(`📝 행사 ${eventId} 수정 중...`);
      await updateEventInSheet(eventId, updates);
      return NextResponse.json({ success: true, eventId, updates });
    } else {
      console.log('⚠️ Google Sheets가 설정되지 않았습니다. Mock 모드에서는 행사 수정이 저장되지 않습니다.');
      return NextResponse.json({ success: false, message: 'Google Sheets not configured' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ 행사 수정 실패:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
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

    if (hasGoogleSheetsConfig) {
      console.log(`🗑️ 행사 ${eventId} 삭제 중...`);
      await deleteEventInSheet(eventId);
      return NextResponse.json({ success: true, eventId });
    } else {
      console.log('⚠️ Google Sheets가 설정되지 않았습니다. Mock 모드에서는 행사 삭제가 저장되지 않습니다.');
      return NextResponse.json({ success: false, message: 'Google Sheets not configured' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ 행사 삭제 실패:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
