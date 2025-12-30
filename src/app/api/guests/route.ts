import { NextResponse } from "next/server";
import { fetchGuestsFromSheet, createGuestInSheet, updateGuestInSheet, deleteGuestInSheet } from "@/lib/google-sheets";
import { MOCK_GUESTS } from "@/lib/mock-data";
import { Guest } from "@/types";

export async function GET() {
    try {
        // Google Sheets API가 설정되어 있는지 확인
        const hasGoogleSheetsConfig =
            process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
            process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
            process.env.GOOGLE_SHEETS_PRIVATE_KEY;

        // Google Sheets가 설정되어 있으면 시트에서 가져오기, 아니면 Mock 데이터 사용
        if (hasGoogleSheetsConfig) {
            console.log('📊 Google Sheets에서 모든 내빈 데이터를 가져옵니다...');
            const guests = await fetchGuestsFromSheet();
            return NextResponse.json(guests);
        } else {
            console.log('⚠️ Google Sheets가 설정되지 않아 Mock 데이터를 사용합니다.');
            return NextResponse.json(MOCK_GUESTS);
        }
    } catch (error: any) {
        console.error('❌ 내빈 데이터 조회 실패:', error.message);

        // 에러 발생 시 Mock 데이터 반환 (Fallback)
        console.log('🔄 Fallback: Mock 데이터를 반환합니다.');
        return NextResponse.json(MOCK_GUESTS);
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const guest: Guest = body;

        // Google Sheets API가 설정되어 있는지 확인
        const hasGoogleSheetsConfig =
            process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
            process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
            process.env.GOOGLE_SHEETS_PRIVATE_KEY;

        if (hasGoogleSheetsConfig) {
            console.log(`📝 내빈 "${guest.name}" 생성 중...`);
            await createGuestInSheet(guest);
            return NextResponse.json({ success: true, guest }, { status: 201 });
        } else {
            console.log('⚠️ Google Sheets가 설정되지 않았습니다. Mock 모드에서는 내빈 생성이 저장되지 않습니다.');
            return NextResponse.json({ success: false, message: 'Google Sheets not configured' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('❌ 내빈 생성 실패:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { guestId, updates } = body;

        if (!guestId) {
            return NextResponse.json({ error: "Guest ID is required" }, { status: 400 });
        }

        // Google Sheets API가 설정되어 있는지 확인
        const hasGoogleSheetsConfig =
            process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
            process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
            process.env.GOOGLE_SHEETS_PRIVATE_KEY;

        if (hasGoogleSheetsConfig) {
            console.log(`📝 내빈 ${guestId} 수정 중...`);
            await updateGuestInSheet(guestId, updates);
            return NextResponse.json({ success: true, guestId, updates });
        } else {
            console.log('⚠️ Google Sheets가 설정되지 않았습니다. Mock 모드에서는 내빈 수정이 저장되지 않습니다.');
            return NextResponse.json({ success: false, message: 'Google Sheets not configured' }, { status: 400 });
        }
    } catch (error: any) {
        console.error("❌ 내빈 수정 실패:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const guestId = searchParams.get("guestId");

        if (!guestId) {
            return NextResponse.json({ error: "Guest ID is required" }, { status: 400 });
        }

        // Google Sheets API가 설정되어 있는지 확인
        const hasGoogleSheetsConfig =
            process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
            process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
            process.env.GOOGLE_SHEETS_PRIVATE_KEY;

        if (hasGoogleSheetsConfig) {
            console.log(`🗑️ 내빈 ${guestId} 삭제 중...`);
            await deleteGuestInSheet(guestId);
            return NextResponse.json({ success: true, guestId });
        } else {
            console.log('⚠️ Google Sheets가 설정되지 않았습니다. Mock 모드에서는 내빈 삭제가 저장되지 않습니다.');
            return NextResponse.json({ success: false, message: 'Google Sheets not configured' }, { status: 400 });
        }
    } catch (error: any) {
        console.error("❌ 내빈 삭제 실패:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
