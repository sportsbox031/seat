"use client";

import { useState } from "react";
import { Guest } from "@/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, CheckCircle2, XCircle, Edit, Trash2 } from "lucide-react";

interface ProtocolModalProps {
    guest: Guest | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEditGuest?: (guest: Guest) => void;
    onUpdateStatus?: (guestId: string, status: "arrived" | "not_arrived" | "cancelled", removeSeat?: boolean) => void;
    onDeleteGuest?: (guestId: string) => void;
}

export function ProtocolModal({ guest, open, onOpenChange, onEditGuest, onUpdateStatus, onDeleteGuest }: ProtocolModalProps) {
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [removeSeatOnCancel, setRemoveSeatOnCancel] = useState(true); // 기본값 true

    if (!guest) return null;

    const handleArrivalToggle = () => {
        if (!onUpdateStatus) return;

        if (guest.status === "arrived") {
            onUpdateStatus(guest.id, "not_arrived");
        } else {
            onUpdateStatus(guest.id, "arrived");
        }
    };

    const handleCancelGuest = () => {
        // 좌석이 배정되어 있으면 기본적으로 삭제 체크
        setRemoveSeatOnCancel(!!guest.seatNumber);
        setShowCancelDialog(true);
    };

    const confirmCancelGuest = () => {
        if (!onUpdateStatus) return;
        onUpdateStatus(guest.id, "cancelled", removeSeatOnCancel);
        setShowCancelDialog(false);
        onOpenChange(false);
    };

    const handleDeleteGuest = () => {
        setShowDeleteDialog(true);
    };

    const confirmDeleteGuest = () => {
        if (!onDeleteGuest) return;
        onDeleteGuest(guest.id);
        setShowDeleteDialog(false);
        onOpenChange(false);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px] border-l-4 border-l-primary">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-2">
                            {guest.type === "vip" && <Badge variant="outline" className="border-amber-400 text-amber-600">VIP</Badge>}
                        </div>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            {guest.name} <span className="text-lg font-normal text-muted-foreground">{guest.position}</span>
                        </DialogTitle>
                        <DialogDescription className="text-base text-foreground/80">
                            {guest.organization}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Protocol Alerts */}
                        {guest.protocolNotes && guest.protocolNotes.length > 0 && (
                            <Alert variant="destructive" className="bg-rose-50 border-rose-200">
                                <ShieldAlert className="h-4 w-4 text-rose-600" />
                                <AlertTitle className="text-rose-700 font-bold mb-1">의전 특이사항 (Protocol Alert)</AlertTitle>
                                <AlertDescription className="text-rose-600 font-medium">
                                    <ul className="list-disc pl-4 space-y-1">
                                        {guest.protocolNotes.map((note, idx) => (
                                            <li key={idx}>{note}</li>
                                        ))}
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-3 rounded-lg border">
                                <span className="text-xs text-muted-foreground block mb-1">배정 좌석</span>
                                <span className="text-xl font-bold font-mono">{guest.seatNumber || "미배정"}</span>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border">
                                <span className="text-xs text-muted-foreground block mb-1">도착 상태</span>
                                <span className={`text-xl font-bold ${guest.status === 'arrived' ? 'text-emerald-600' : guest.status === 'cancelled' ? 'text-red-500' : 'text-slate-500'}`}>
                                    {guest.status === 'arrived' ? '도착' : guest.status === 'cancelled' ? '불참' : '미도착'}
                                </span>
                            </div>
                        </div>

                        {guest.biography && (
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-muted-foreground">내빈 정보</h4>
                                <p className="text-sm p-3 bg-muted rounded-md leading-relaxed">
                                    {guest.biography}
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex gap-2 sm:justify-between">
                        <div className="flex gap-2">
                            <Button
                                variant="destructive"
                                onClick={handleDeleteGuest}
                                className="gap-2"
                            >
                                <Trash2 className="w-4 h-4" /> 삭제
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => onEditGuest && onEditGuest(guest)}
                                className="gap-2"
                            >
                                <Edit className="w-4 h-4" /> 수정
                            </Button>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                닫기
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            {guest.status === "cancelled" ? (
                                <>
                                    <Button
                                        variant="outline"
                                        className="text-slate-600 hover:text-slate-700"
                                        onClick={() => onUpdateStatus && onUpdateStatus(guest.id, "not_arrived")}
                                    >
                                        미도착으로 변경
                                    </Button>
                                    <Button
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                                        onClick={() => onUpdateStatus && onUpdateStatus(guest.id, "arrived")}
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        도착 확인
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant="ghost"
                                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                        onClick={handleCancelGuest}
                                    >
                                        <XCircle className="w-4 h-4 mr-2" /> 불참 처리
                                    </Button>
                                    <Button
                                        className={guest.status === "arrived"
                                            ? "bg-slate-600 hover:bg-slate-700 text-white shadow-md"
                                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                                        }
                                        onClick={handleArrivalToggle}
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        {guest.status === "arrived" ? "미도착 처리" : "도착 확인"}
                                    </Button>
                                </>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel Confirmation Dialog */}
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>불참 처리 확인</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div>
                                <div className="mb-2">
                                    <span className="font-bold">{guest.name}</span> 님을 불참 처리하시겠습니까?
                                </div>
                                {guest.seatNumber && (
                                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                                        <div className="text-sm text-amber-800">
                                            현재 배정된 좌석: <span className="font-mono font-bold">{guest.seatNumber}</span>
                                        </div>
                                        <label className="flex items-center gap-2 mt-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={removeSeatOnCancel}
                                                onChange={(e) => setRemoveSeatOnCancel(e.target.checked)}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-sm font-medium text-amber-900">배정된 좌석을 삭제하고 빈 좌석으로 변경</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmCancelGuest}
                            className="bg-rose-600 hover:bg-rose-700"
                        >
                            불참 처리
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>내빈 삭제 확인</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div>
                                <div className="mb-2">
                                    <span className="font-bold">{guest.name}</span> 님의 정보를 완전히 삭제하시겠습니까?
                                </div>
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                    <div className="text-sm text-red-800 font-medium">
                                        ⚠️ 이 작업은 되돌릴 수 없습니다.
                                    </div>
                                    <div className="text-sm text-red-700 mt-2">
                                        내빈의 모든 정보(이름, 소속, 좌석 배정 등)가 영구적으로 삭제됩니다.
                                    </div>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteGuest}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            삭제
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
