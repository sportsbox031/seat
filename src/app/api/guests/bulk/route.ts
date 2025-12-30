import { NextResponse } from "next/server";
import { createGuestsInSheetBulk } from "@/lib/google-sheets";
import { Guest } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const guests: Guest[] = body.guests;

    if (!Array.isArray(guests) || guests.length === 0) {
      return NextResponse.json(
        { error: "유효한 내빈 배열이 필요합니다" },
        { status: 400 }
      );
    }

    // Google Sheets API가 설정되어 있는지 확인
    const hasGoogleSheetsConfig =
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
      process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
      process.env.GOOGLE_SHEETS_PRIVATE_KEY;

    if (hasGoogleSheetsConfig) {
      console.log(`📝 ${guests.length}명의 내빈 일괄 생성 중...`);
      await createGuestsInSheetBulk(guests);
      return NextResponse.json(
        { success: true, count: guests.length },
        { status: 201 }
      );
    } else {
      console.log(
        "⚠️ Google Sheets가 설정되지 않았습니다. Mock 모드에서는 내빈 일괄 생성이 저장되지 않습니다."
      );
      return NextResponse.json(
        { success: false, message: "Google Sheets not configured" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("❌ 내빈 일괄 생성 실패:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
