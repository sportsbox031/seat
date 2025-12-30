"use client";

import { Guest } from "@/types";
import { useEffect } from "react";

interface NameBadgeProps {
    guests: Guest[];
    eventTitle: string;
    onClose: () => void;
}

export function NameBadgePrint({ guests, eventTitle, onClose }: NameBadgeProps) {
    useEffect(() => {
        // 컴포넌트 마운트 후 인쇄 다이얼로그 표시
        const timer = setTimeout(() => {
            window.print();
        }, 500);

        // 인쇄 완료 후 닫기
        const handleAfterPrint = () => {
            onClose();
        };

        window.addEventListener('afterprint', handleAfterPrint);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, [onClose]);

    return (
        <>
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .name-badge-container,
                    .name-badge-container * {
                        visibility: visible;
                    }
                    .name-badge-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                }
            `}</style>

            <div className="name-badge-container hidden print:block">
                <div className="grid grid-cols-2 gap-4">
                    {guests.map((guest) => (
                        <div
                            key={guest.id}
                            className="border-2 border-slate-300 rounded-lg p-6 bg-white break-inside-avoid mb-4"
                            style={{ height: '250px' }}
                        >
                            {/* 상단: 행사명 */}
                            <div className="text-center border-b-2 border-slate-200 pb-3 mb-4">
                                <div className="text-xs font-medium text-slate-600 mb-1">
                                    G-Protocol
                                </div>
                                <div className="text-sm font-bold text-slate-800">
                                    {eventTitle}
                                </div>
                            </div>

                            {/* 중앙: 이름 (대형) */}
                            <div className="text-center mb-4">
                                <div className="text-4xl font-bold text-slate-900 mb-2">
                                    {guest.name}
                                </div>
                                {guest.type === 'vip' && (
                                    <div className="inline-block bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                                        VIP
                                    </div>
                                )}
                            </div>

                            {/* 하단: 소속/직책 */}
                            <div className="text-center space-y-1">
                                <div className="text-lg font-semibold text-slate-700">
                                    {guest.organization}
                                </div>
                                <div className="text-base text-slate-600">
                                    {guest.position}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 화면용 미리보기 */}
            <div className="print:hidden p-8 bg-slate-100 min-h-screen">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                        <h2 className="text-2xl font-bold mb-2">명찰 인쇄 미리보기</h2>
                        <p className="text-slate-600">총 {guests.length}명의 명찰이 생성됩니다.</p>
                        <button
                            onClick={onClose}
                            className="mt-4 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded"
                        >
                            닫기
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {guests.map((guest) => (
                            <div
                                key={guest.id}
                                className="border-2 border-slate-300 rounded-lg p-6 bg-white relative"
                                style={{ height: '250px' }}
                            >
                                <div className="text-center border-b-2 border-slate-200 pb-3 mb-4">
                                    <div className="text-xs font-medium text-slate-600 mb-1">
                                        G-Protocol
                                    </div>
                                    <div className="text-sm font-bold text-slate-800">
                                        {eventTitle}
                                    </div>
                                </div>

                                <div className="text-center mb-4">
                                    <div className="text-4xl font-bold text-slate-900 mb-2">
                                        {guest.name}
                                    </div>
                                    {guest.type === 'vip' && (
                                        <div className="inline-block bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                                            VIP
                                        </div>
                                    )}
                                </div>

                                <div className="text-center space-y-1">
                                    <div className="text-lg font-semibold text-slate-700">
                                        {guest.organization}
                                    </div>
                                    <div className="text-base text-slate-600">
                                        {guest.position}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
