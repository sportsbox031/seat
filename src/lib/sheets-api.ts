import { Guest, GuestStatus } from "@/types";
import { MOCK_GUESTS } from "./mock-data";

// This service handles interaction with Google Sheets OR Mock Data
// In production, we would use 'googleapis' package.

export async function fetchGuestsFromSheet(): Promise<Guest[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Return Mock Data (In real app, fetch from Sheets)
    return MOCK_GUESTS;
}

export async function updateGuestStatusInSheet(guestId: string, status: GuestStatus): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log(`Updated guest ${guestId} to ${status}`);
    return true;
}

export async function syncGuestsToSheet(guests: Guest[]): Promise<boolean> {
    // Used when uploading Excel/OCR result to Sheet
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log(`Synced ${guests.length} guests to Sheet`);
    return true;
}
