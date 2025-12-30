"use client";

import { useState, useEffect } from "react";
import { Guest, GuestType } from "@/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface EditGuestModalProps {
    guest: Guest | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave?: (updatedGuest: Guest | Omit<Guest, 'id' | 'updatedAt'>) => void;
}

export function EditGuestModal({ guest, open, onOpenChange, onSave }: EditGuestModalProps) {
    const [formData, setFormData] = useState<Partial<Guest>>({});
    const [protocolNoteInput, setProtocolNoteInput] = useState("");
    const isAddMode = !guest;

    useEffect(() => {
        if (guest) {
            setFormData({
                ...guest,
                protocolNotes: guest.protocolNotes || [],
            });
        } else if (open) {
            // 새 게스트 추가 모드 - 초기값 설정
            setFormData({
                name: '',
                organization: '',
                position: '',
                type: 'regular',
                status: 'not_arrived',
                seatNumber: null,
                biography: '',
                protocolNotes: [],
            });
        }
    }, [guest, open]);

    const handleSave = () => {
        if (!onSave) return;
        onSave(formData as Guest);
        onOpenChange(false);
    };

    const handleAddProtocolNote = () => {
        if (!protocolNoteInput.trim()) return;
        setFormData({
            ...formData,
            protocolNotes: [...(formData.protocolNotes || []), protocolNoteInput.trim()],
        });
        setProtocolNoteInput("");
    };

    const handleRemoveProtocolNote = (index: number) => {
        setFormData({
            ...formData,
            protocolNotes: (formData.protocolNotes || []).filter((_, i) => i !== index),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                        {isAddMode ? '새 내빈 추가' : '내빈 정보 수정'}
                    </DialogTitle>
                    <DialogDescription>
                        {isAddMode ? '새로운 내빈 정보를 입력하세요.' : 'OCR로 인식된 정보를 수정할 수 있습니다.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">이름 *</Label>
                            <Input
                                id="name"
                                value={formData.name || ""}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="이름 입력"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="position">직책 *</Label>
                            <Input
                                id="position"
                                value={formData.position || ""}
                                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                placeholder="직책 입력"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="organization">소속 *</Label>
                        <Input
                            id="organization"
                            value={formData.organization || ""}
                            onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                            placeholder="소속 입력"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type">구분</Label>
                        <Select
                            value={formData.type || "regular"}
                            onValueChange={(value: GuestType) => setFormData({ ...formData, type: value })}
                        >
                            <SelectTrigger id="type">
                                    <SelectValue placeholder="구분 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="vip">VIP</SelectItem>
                                    <SelectItem value="regular">일반</SelectItem>
                                    <SelectItem value="staff">실무진</SelectItem>
                                    <SelectItem value="press">언론</SelectItem>
                                </SelectContent>
                            </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="biography">내빈 정보 / 의전 메모</Label>
                        <Textarea
                            id="biography"
                            value={formData.biography || ""}
                            onChange={(e) => setFormData({ ...formData, biography: e.target.value })}
                            placeholder="내빈 정보, 약력, 의전 메모 등을 입력하세요"
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>의전 특이사항 (Protocol Notes)</Label>
                        <div className="flex gap-2">
                            <Input
                                value={protocolNoteInput}
                                onChange={(e) => setProtocolNoteInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddProtocolNote();
                                    }
                                }}
                                placeholder="예: 휠체어, 대리수상, 인사말씀 등"
                            />
                            <Button type="button" onClick={handleAddProtocolNote} variant="secondary">
                                추가
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {(formData.protocolNotes || []).map((note, index) => (
                                <Badge
                                    key={index}
                                    variant="destructive"
                                    className="bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200 cursor-pointer"
                                    onClick={() => handleRemoveProtocolNote(index)}
                                >
                                    {note} <X className="w-3 h-3 ml-1" />
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        취소
                    </Button>
                    <Button onClick={handleSave} className="bg-primary">
                        {isAddMode ? '추가' : '저장'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
