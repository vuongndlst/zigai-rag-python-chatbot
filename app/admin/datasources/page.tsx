"use client";

import { useState, useRef, useEffect } from 'react';
import { Loader, CheckCircle, XCircle, Terminal, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function DatasourcePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setLogs([]);
      setStatus('idle');
    }
  };

  const handleProcessFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    setLogs([]);
    setStatus('idle');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/process-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Lỗi từ server: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        setLogs(prev => [...prev, chunk]);
      }

      setLogs(prevLogs => {
        if (prevLogs.some(log => log.includes('💥') || log.includes('Lỗi'))) {
            setStatus('error');
        } else {
            setStatus('success');
        }
        return prevLogs;
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setLogs(prev => [...prev, `\n\n💥 Lỗi kết nối: ${errorMessage}`]);
      setStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-3 h-6 w-6" />
            Tải lên & Xử lý tài liệu PDF
          </CardTitle>
          <CardDescription>
            Chọn file PDF từ máy tính của bạn để cập nhật kiến thức cho AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <input 
              id="file-upload"
              type="file" 
              accept=".pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </div>
          {file && (
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Đã chọn: <span className="font-medium text-foreground">{file.name}</span>
                </div>
                <Button onClick={handleProcessFile} disabled={isProcessing}>
                    {isProcessing && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                    {isProcessing ? 'Đang xử lý...' : 'Tải lên & Xử lý'}
                </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {(logs.length > 0 || isProcessing) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
                <Terminal className="mr-3 h-6 w-6" />
                Nhật ký xử lý
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre ref={logsEndRef} className="bg-gray-900 text-white font-mono text-sm rounded-lg p-4 h-96 overflow-y-auto">
              {logs.join('')}
              {isProcessing && <Loader className="inline-block ml-2 h-4 w-4 animate-spin" />}
            </pre>
            <div className="mt-4">
                {status === 'success' && <p className="text-sm text-green-600 flex items-center"><CheckCircle className="mr-2 h-4 w-4"/>Hoàn tất xử lý thành công!</p>}
                {status === 'error' && <p className="text-sm text-red-600 flex items-center"><XCircle className="mr-2 h-4 w-4"/>Đã xảy ra lỗi trong quá trình xử lý.</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
