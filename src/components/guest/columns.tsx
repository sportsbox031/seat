"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Guest } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Star } from "lucide-react";

export const columns: ColumnDef<Guest>[] = [
    {
        accessorKey: "status",
        header: "상태",
        cell: ({ row }) => {
            const status = row.getValue("status") as string;

            let badgeVariant: "default" | "destructive" | "outline" | "secondary" = "outline";
            let badgeText = "미도착";
            let className = "";

            if (status === "arrived") {
                badgeVariant = "default"; // Green (Primary)
                badgeText = "도착";
                className = "bg-emerald-500 hover:bg-emerald-600";
            } else if (status === "cancelled") {
                badgeVariant = "destructive";
                badgeText = "불참";
            } else if (status === "not_arrived") {
                badgeVariant = "secondary";
                badgeText = "미도착";
            }

            return <Badge variant={badgeVariant} className={className}>{badgeText}</Badge>;
        },
    },
    {
        accessorKey: "name",
        header: "이름",
        cell: ({ row }) => {
            const guest = row.original;
            return (
                <div className="flex items-center gap-2">
                    <span className="font-bold text-base">{guest.name}</span>
                    {guest.type === 'vip' && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                    {guest.protocolNotes && guest.protocolNotes.length > 0 && <ShieldAlert className="w-4 h-4 text-rose-500" />}
                </div>
            )
        }
    },
    {
        accessorKey: "organization",
        header: "소속",
    },
    {
        accessorKey: "position",
        header: "직함",
    },
    {
        accessorKey: "seatNumber",
        header: "좌석",
        cell: ({ row }) => {
            const seat = row.original.seatNumber;
            return seat ? (
                <div className="font-mono text-xs bg-slate-100 px-2 py-1 rounded w-fit font-bold">
                    {seat}
                </div>
            ) : (
                <span className="text-muted-foreground text-xs">미배정</span>
            );
        }
    },
];
