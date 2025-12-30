"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle, Download, AlertCircle, Grid3x3 } from "lucide-react";
import { downloadGuestTemplate, parseGuestExcel } from "@/lib/excel-utils";
import { Guest, Seat } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { generateSeatsFromGuests, getSeatLayoutSummary, calculateGridSize } from "@/lib/seat-generator";
import { Checkbox } from "@/components/ui/checkbox";

interface UploadDialogProps {
    onGuestsImport?: (guests: Guest[], gridSize?: { rows: number; cols: number; rowLabels: string[] }) => void;
}

export function UploadDialog({ onGuestsImport }: UploadDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importedCount, setImportedCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [autoGenerateSeats, setAutoGenerateSeats] = useState(true);
    const [seatLayoutInfo, setSeatLayoutInfo] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setIsSuccess(false);
            setError(null);
        }
    };

    const handleDownloadTemplate = () => {
        downloadGuestTemplate();
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setError(null);
        setSeatLayoutInfo(null);

        try {
            // 엑셀 파일 파싱
            const guests = await parseGuestExcel(file);

            if (guests.length === 0) {
                setError('유효한 데이터가 없습니다. 엑셀 파일을 확인해주세요.');
                setIsUploading(false);
                return;
            }

            let gridSize: { rows: number; cols: number; rowLabels: string[] } | undefined = undefined;

            // 자동 좌석 배치 생성
            if (autoGenerateSeats) {
                const summary = getSeatLayoutSummary(guests);

                if (summary.totalSeats > 0) {
                    gridSize = calculateGridSize(guests);
                    setSeatLayoutInfo(
                        `${gridSize.rows}행 x ${gridSize.cols}열 그리드 생성됨 (총 ${summary.totalSeats}개 좌석)`
                    );
                } else {
                    setSeatLayoutInfo('좌석번호가 없어 배치도를 생성하지 않았습니다.');
                }
            }

            // 부모 컴포넌트로 데이터 전달
            if (onGuestsImport) {
                onGuestsImport(guests, gridSize);
            }

            setImportedCount(guests.length);
            setIsUploading(false);
            setIsSuccess(true);

            // 3초 후 다이얼로그 닫기
            setTimeout(() => {
                setOpen(false);
                setFile(null);
                setIsSuccess(false);
                setImportedCount(0);
                setSeatLayoutInfo(null);
            }, 3000);
        } catch (err) {
            setError((err as Error).message);
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <UploadCloud className="w-4 h-4" />
                    내빈 명단 업로드
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>내빈 명단 업로드</DialogTitle>
                    <DialogDescription>
                        엑셀 양식에 맞춰 작성한 내빈 명단을 업로드하세요.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {/* 양식 다운로드 버튼 */}
                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900">엑셀 양식이 필요하신가요?</p>
                            <p className="text-xs text-blue-700">양식을 다운로드하여 내빈 정보를 입력하세요.</p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadTemplate}
                            className="gap-1 border-blue-300 text-blue-700 hover:bg-blue-100"
                        >
                            <Download className="w-4 h-4" />
                            양식 다운로드
                        </Button>
                    </div>

                    {/* 파일 업로드 */}
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="file">내빈 명단 파일 (.xlsx)</Label>
                        <Input
                            id="file"
                            type="file"
                            accept=".xlsx"
                            onChange={handleFileChange}
                            disabled={isUploading}
                        />
                    </div>

                    {file && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded border">
                            <FileSpreadsheet className="w-4 h-4 text-green-600" />
                            <span className="truncate flex-1">{file.name}</span>
                            <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                    )}

                    {/* 자동 좌석 배치 옵션 */}
                    <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-md">
                        <Grid3x3 className="w-5 h-5 text-purple-600" />
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="auto-seats"
                                    checked={autoGenerateSeats}
                                    onCheckedChange={(checked) => setAutoGenerateSeats(checked as boolean)}
                                />
                                <label
                                    htmlFor="auto-seats"
                                    className="text-sm font-medium text-purple-900 cursor-pointer"
                                >
                                    좌석번호 기반 자동 배치도 생성
                                </label>
                            </div>
                            <p className="text-xs text-purple-700 mt-1 ml-6">
                                엑셀의 좌석번호(A-1, B-3 등)를 분석하여 좌석 배치도를 자동으로 만듭니다.
                            </p>
                        </div>
                    </div>

                    {/* 에러 메시지 */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* 성공 메시지 */}
                    {isSuccess && (
                        <Alert className="bg-green-50 border-green-200">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-700">
                                <div>총 {importedCount}명의 내빈이 성공적으로 업로드되었습니다!</div>
                                {seatLayoutInfo && (
                                    <div className="text-xs mt-1 text-green-600">
                                        {seatLayoutInfo}
                                    </div>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
                <DialogFooter>
                    <Button
                        onClick={handleUpload}
                        disabled={!file || isUploading || isSuccess}
                        className="w-full"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                업로드 중...
                            </>
                        ) : isSuccess ? (
                            <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                업로드 완료
                            </>
                        ) : (
                            <>
                                <UploadCloud className="w-4 h-4 mr-2" />
                                명단 업로드
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
