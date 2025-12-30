import { NextResponse } from "next/server";
import { fetchGuestsFromSheet } from "@/lib/sheets-api";

export async function GET() {
    try {
        const data = await fetchGuestsFromSheet();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch guests" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    // Handle creating new guests or bulk sync
    return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { guestId, updates } = body;

        if (!guestId) {
            return NextResponse.json({ error: "Guest ID is required" }, { status: 400 });
        }

        // TODO: 실제 Google Sheets 업데이트 로직 추가
        // await updateGuestInSheet(guestId, updates);

        return NextResponse.json({
            success: true,
            guestId,
            updates,
            message: "Guest updated successfully"
        });
    } catch (error) {
        console.error("Error updating guest:", error);
        return NextResponse.json({ error: "Failed to update guest" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const guestId = searchParams.get("guestId");

        if (!guestId) {
            return NextResponse.json({ error: "Guest ID is required" }, { status: 400 });
        }

        // TODO: 실제 Google Sheets 삭제 로직 추가
        // await deleteGuestFromSheet(guestId);

        return NextResponse.json({
            success: true,
            guestId,
            message: "Guest deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting guest:", error);
        return NextResponse.json({ error: "Failed to delete guest" }, { status: 500 });
    }
}
