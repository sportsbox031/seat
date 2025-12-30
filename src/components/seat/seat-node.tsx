"use client";

import { Seat, Guest } from "@/types";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { User, Star } from "lucide-react";

interface SeatNodeProps {
    seat: Seat;
    guest?: Guest;
    onClick: (seat: Seat) => void;
}

export function SeatNode({ seat, guest, onClick }: SeatNodeProps) {
    // Determine color based on status
    // Empty: slate-200
    // Reserved (Pending): slate-400
    // Occupied (Attend): Primary (Navy)
    // VIP: Yellow border or Star icon

    const isVip = guest?.type === "vip";
    const isAttend = guest?.status === "attend";

    let bgColor = "bg-slate-100 border-slate-300";
    let iconColor = "text-slate-300";

    if (seat.status === "reserved" || (seat.guestId && !isAttend)) {
        bgColor = "bg-slate-200 border-slate-400";
        iconColor = "text-slate-500";
    } else if (seat.status === "occupied" || isAttend) {
        bgColor = "bg-primary border-primary";
        iconColor = "text-primary-foreground";
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            "absolute w-10 h-10 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all hover:scale-110 shadow-sm",
                            bgColor,
                            isVip && "ring-2 ring-amber-400 ring-offset-2"
                        )}
                        style={{
                            left: seat.x,
                            top: seat.y,
                            transform: "translate(-50%, -50%)", // Center anchor
                        }}
                        onClick={() => onClick(seat)}
                    >
                        {isVip ? (
                            <Star className={cn("w-5 h-5 fill-current", isAttend ? "text-amber-300" : "text-amber-500")} />
                        ) : (
                            <span className={cn("text-xs font-bold", iconColor)}>
                                {guest ? guest.name.substring(0, 1) : seat.label}
                            </span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                    {guest ? (
                        <div className="text-center">
                            <p className="font-bold">{guest.name}</p>
                            <p className="text-xs text-muted-foreground">{guest.organization}</p>
                            <p className="text-xs text-muted-foreground">{guest.position}</p>
                            {guest.seatNumber && <p className="text-xs mt-1 font-mono">{guest.tableNumber}T-{guest.seatNumber}</p>}
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="font-bold text-muted-foreground">빈 좌석</p>
                            <p className="text-xs font-mono">{seat.tableId} - {seat.label}</p>
                        </div>
                    )}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
