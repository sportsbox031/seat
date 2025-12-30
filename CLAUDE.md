# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

G-Protocol (경기도 스마트 의전 시스템) - A smart protocol and seating management system for Gyeonggi Province sports events. The application manages guest lists, seat assignments, and real-time attendance tracking with VIP protocol support.

## Development Commands

```bash
# Development
npm run dev          # Start development server on http://localhost:3000

# Build & Production
npm run build        # Build for production
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint
```

## Architecture Overview

### Core Application Structure

This is a **Next.js 16 App Router** application with server and client components split appropriately:

- **Server Components**: Layout (`src/app/layout.tsx`), API routes
- **Client Components**: All interactive UI (marked with `"use client"`)
- **State Management**: TanStack Query (React Query) for server state
- **Styling**: Tailwind CSS v4 with shadcn/ui components (New York style)

### Key Domain Concepts

The application revolves around three main entities defined in `src/types/index.ts`:

1. **Guest**: VIP and regular guests with protocol notes, seating assignments, and attendance status
2. **Seat**: Individual seats linked to tables with positioning data
3. **TableGroup**: Physical table groupings containing multiple seats

### Data Flow Architecture

**Current (Mock)**:
- `src/lib/mock-data.ts` → API route `/api/guests` → TanStack Query → UI components

**Future (Production)**:
- Google Sheets ↔ `src/lib/sheets-api.ts` → API routes → UI

The `sheets-api.ts` service layer is prepared with functions (`fetchGuestsFromSheet`, `updateGuestStatusInSheet`, `syncGuestsToSheet`) but currently returns mock data with simulated delays.

### Component Architecture

**Main Layout** (`src/app/page.tsx`):
- Horizontal split with manual resize handle (custom implementation, NOT react-resizable-panels)
- Left panel: `<GuestList />` (default 45% width, 30-60% range)
- Right panel: `<SeatMap />` (remaining width)
- Resize handle uses mouse events and state management

**Guest Management** (`src/components/guest/`):
- `guest-list.tsx`: Search, filtering (all/VIP/unassigned), displays guest table
- `data-table.tsx`: TanStack Table implementation with row click handling and drag support
- `columns.tsx`: Column definitions with status badges, guest types
- `protocol-modal.tsx`: Detailed guest information dialog
- `edit-guest-modal.tsx`: Guest creation/editing form

**Seat Visualization** (`src/components/seat/`):
- `seat-map.tsx`: Theater-style grid layout with drag-and-drop support, real-time stats overlay
- Grid is generated dynamically based on row/col settings or imported Excel dimensions
- Supports both click-to-assign and drag-and-drop assignment from guest list

### Korean Language Support

**Hangul Search** (`src/lib/hangul.ts`):
- Implements **chosung (초성)** search for Korean characters
- Example: Searching "ㄱㅅ" matches "김선" or "고수"
- Used in `guest-list.tsx` and `seat-map.tsx` search functionality via `hangulMatch()`

### UI Component System

Uses **shadcn/ui** with customizations:

- Import path: `@/components/ui/*`
- Configured in `components.json` with "new-york" style variant
- Theme tokens use CSS custom properties defined in `globals.css`
- Font: Pretendard Variable (optimized for Korean)
- Base color: neutral, CSS variables enabled

**Path Aliases** (tsconfig.json):
- `@/*` → `./src/*`
- Additional shadcn aliases: `@/components`, `@/lib`, `@/hooks`

### Styling Conventions

- Tailwind CSS v4 with `@import "tailwindcss"` (no config file needed)
- Uses `tw-animate-css` plugin for animations
- Korean typography: Pretendard Variable font loaded via CDN
- Color system: Uses CSS custom properties with light/dark mode support
- Utility function: `cn()` in `src/lib/utils.ts` for conditional class merging

## Important Implementation Notes

### State Management Patterns

- **Client state**: React useState for UI-only state (search, filters, modals, guests array)
- **Server state**: TanStack Query with 1-minute stale time (configured in `providers.tsx`)
- Currently using mock data directly imported; will migrate to React Query fetching when Google Sheets integration is implemented

### Localization

- Primary language: Korean (lang="ko" in layout)
- UI labels, metadata, and content are in Korean
- Keep all user-facing text in Korean when adding features

### Data Mocking Strategy

When the Google Sheets integration is implemented:
1. Replace imports from `mock-data.ts` with React Query hooks
2. Update API route handlers in `src/app/api/guests/route.ts`
3. Implement actual Google Sheets API calls in `sheets-api.ts`
4. Mock data structure matches production schema - no migration needed

### Performance Considerations

- Guest list filtering happens client-side (acceptable for <1000 guests)
- Seat map uses CSS grid-like layout with absolute positioning for precise control
- TanStack Table handles virtualization if guest list grows large

### Drag and Drop Support

- Guest list rows are draggable via `draggable` attribute
- `onDragStart` and `onDragEnd` handlers manage `draggedGuest` state in parent
- Seat map handles `onDragOver`, `onDragLeave`, and `onDrop` events
- Drop target visual feedback with ring and scale effects

## Technology Stack

- **Framework**: Next.js 16 (App Router, React 19.2)
- **UI**: Radix UI primitives + shadcn/ui components
- **Styling**: Tailwind CSS v4, tw-animate-css
- **State**: TanStack Query (React Query)
- **Tables**: TanStack Table
- **Charts**: Recharts
- **Icons**: Lucide React
- **Utilities**: clsx, tailwind-merge, date-fns
- **Excel**: xlsx (for import/export functionality)
