// Vị trí file: app/admin/datasources/page.tsx

"use client";

import React, { useState, useRef, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { UploadCloud, Loader, FileText, Clock, FileStack, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from "@/components/ui/alert";

const fetcher = (url: string) => fetch(url).then(res => res.json());

// SỬA LỖI: Component mới để xử lý Hydration Mismatch cho ngày tháng
function ClientSideDate({ dateString }: { dateString: string }) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        // Render một placeholder hoặc null trên server và trong lần render đầu tiên của client
        return null;
    }

    return <>{new Date(dateString).toLocaleString('vi-VN')}</>;
}


// Component con để hiển thị lịch sử các lần xử lý
function SeedHistory() {
    const { data: logs, error } = useSWR('/api/admin/seed-logs', fetcher, { refreshInterval: 5000 }); // Tự động làm mới sau mỗi 5s

    if (error) return <p className="text-red-500">Không thể tải lịch sử xử lý.</p>;
    if (!logs) return <div className="flex justify-center p-10"><Loader className="h-8 w-8 animate-spin" /></div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Nhật ký Nạp dữ liệu</CardTitle>
                <CardDescription>Lịch sử của tất cả các lần xử lý file PDF.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tên file</TableHead>
                            <TableHead>Ngày xử lý</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead>Số Chunks</TableHead>
                            <TableHead>Thời gian</TableHead>
                            <TableHead>Thông báo</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map((log: any) => (
                            <TableRow key={log._id}>
                                <TableCell className="font-medium flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    {log.filename || "Không rõ"}
                                </TableCell>
                                {/* SỬA LỖI: Sử dụng component ClientSideDate */}
                                <TableCell><ClientSideDate dateString={log.createdAt} /></TableCell>
                                <TableCell>
                                    <Badge variant={log.status === 'Thành công' ? 'default' : 'destructive'} className={log.status === 'Thành công' ? 'bg-green-600' : ''}>
                                        {log.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <FileStack className="h-4 w-4 text-muted-foreground" />
                                        {log.chunkCount}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        {(log.durationMs / 1000).toFixed(2)}s
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                                    {log.error || "Không có lỗi"}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}


// Component chính của trang
export default function DatasourcesPage() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null); // Ref cho input file
    const { mutate } = useSWRConfig(); // Hook để trigger refresh SWR

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setError(null); // Xóa lỗi cũ khi chọn file mới
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError("Vui lòng chọn một file PDF.");
            return;
        }

        setIsProcessing(true);
        setError(null);
        setLogs([]);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/admin/process-pdf', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok || !response.body) {
                const errorData = await response.json().catch(() => ({ error: "Lỗi không xác định từ server." }));
                throw new Error(errorData.error || `Lỗi từ server: ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                setLogs(prev => [...prev, chunk]);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(`Xử lý thất bại: ${errorMessage}`);
            setLogs(prev => [...prev, `\n💥 Lỗi kết nối: ${errorMessage}`]);
        } finally {
            // SỬA LỖI: Luôn luôn reset trạng thái xử lý và làm mới lịch sử
            setIsProcessing(false);
            mutate('/api/admin/seed-logs'); // Trigger refresh cho component SeedHistory
        }
    };

    // NÂNG CẤP: Hàm để reset form và tải file khác
    const handleReset = () => {
        setFile(null);
        setLogs([]);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; // Reset giá trị của input file
        }
    };

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Tải lên Datasource mới</CardTitle>
                    <CardDescription>Chọn một file PDF để xử lý và nạp vào Knowledge Base của chatbot.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input 
                        ref={fileInputRef}
                        type="file" 
                        accept=".pdf" 
                        onChange={handleFileChange} 
                        disabled={isProcessing} 
                    />
                    <Button onClick={handleUpload} disabled={isProcessing || !file}>
                        {isProcessing ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                        {isProcessing ? 'Đang xử lý...' : 'Tải lên và Xử lý'}
                    </Button>
                    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                    {(logs.length > 0) && (
                         <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold">Tiến trình xử lý:</h3>
                                {/* NÂNG CẤP: Hiển thị nút reset khi không còn xử lý */}
                                {!isProcessing && (
                                    <Button variant="outline" size="sm" onClick={handleReset}>
                                        <X className="mr-2 h-4 w-4" />
                                        Xóa Log & Tải file khác
                                    </Button>
                                )}
                            </div>
                            <pre ref={logsEndRef} className="bg-gray-900 text-white font-mono text-sm rounded-lg p-4 h-64 overflow-y-auto">
                                {logs.join('')}
                            </pre>
                         </div>
                    )}
                </CardContent>
            </Card>

            <SeedHistory />
        </div>
    );
}
    