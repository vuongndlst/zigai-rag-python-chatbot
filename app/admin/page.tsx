"use client";

import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { Loader, Users, MessageSquare, Cpu, Save, TrendingUp as TrendingIcon, BarChart3, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

// Fetcher được cải tiến để xử lý lỗi tốt hơn
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Phản hồi không hợp lệ từ server.' }));
    const error = new Error(errorData.error || 'Đã có lỗi xảy ra khi tải dữ liệu.');
    // @ts-ignore
    error.info = errorData;
    // @ts-ignore
    error.status = res.status;
    throw error;
  }
  return res.json();
};

const formatNumber = (num: number) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

// Component hiển thị lỗi chi tiết
function ErrorDisplay({ error }: { error: any }) {
    return (
        <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Không thể tải dữ liệu</AlertTitle>
            <AlertDescription>
                Đã xảy ra lỗi khi kết nối đến server. Vui lòng kiểm tra lại console của server để biết thêm chi tiết.
                <pre className="mt-2 text-xs bg-black/10 p-2 rounded">Lỗi: {error.message}</pre>
            </AlertDescription>
        </Alert>
    );
}

// --- TAB 1: Main Metrics Panel ---
function MainMetricsPanel({ period, onPeriodChange }: { period: string, onPeriodChange: (p: string) => void }) {
    const { data, error } = useSWR(`/api/admin/dashboard?period=${period}`, fetcher);

    if (error) return <ErrorDisplay error={error} />;
    if (!data) return <div className="flex justify-center p-10"><Loader className="h-8 w-8 animate-spin" /></div>;

    const { kpis } = data;

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Select value={period} onValueChange={onPeriodChange}>
                    <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Chọn khoảng thời gian" /></SelectTrigger>
                    <SelectContent><SelectItem value="7d">7 ngày qua</SelectItem><SelectItem value="30d">30 ngày qua</SelectItem><SelectItem value="90d">90 ngày qua</SelectItem></SelectContent>
                </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tổng số người dùng</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatNumber(kpis.totalUsers)}</div><p className="text-xs text-muted-foreground">+{kpis.newUsers} mới</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tổng số đoạn chat</CardTitle><MessageSquare className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatNumber(kpis.totalChats)}</div><p className="text-xs text-muted-foreground">+{kpis.newChats} mới</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tokens đã sử dụng</CardTitle><Cpu className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatNumber(kpis.totalTokensUsed)}</div><p className="text-xs text-muted-foreground">Tổng từ RAG pipeline</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tokens đã tiết kiệm</CardTitle><Save className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">~{formatNumber(kpis.tokensSaved)}</div><p className="text-xs text-muted-foreground">Ước tính từ {kpis.totalCacheHits} cache hits</p></CardContent></Card>
            </div>
        </div>
    );
}

// --- TAB 2: Trending Questions Panel ---
function TrendingQuestionsPanel({ period, onPeriodChange }: { period: string, onPeriodChange: (p: string) => void }) {
    const { data: groups, error } = useSWR(`/api/admin/trending-questions?period=${period}`, fetcher);

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div><CardTitle>Các chủ đề được hỏi nhiều nhất</CardTitle><CardDescription>Các nhóm câu hỏi tương tự nhau được người dùng hỏi thường xuyên.</CardDescription></div>
                    <div className="mt-4 sm:mt-0"><Select value={period} onValueChange={onPeriodChange}><SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Chọn khoảng thời gian" /></SelectTrigger><SelectContent><SelectItem value="7d">7 ngày qua</SelectItem><SelectItem value="30d">30 ngày qua</SelectItem><SelectItem value="90d">90 ngày qua</SelectItem></SelectContent></Select></div>
                </div>
            </CardHeader>
            <CardContent>
                {error && <ErrorDisplay error={error} />}
                {!groups && !error && <div className="flex justify-center items-center h-40"><Loader className="h-8 w-8 animate-spin" /></div>}
                {groups && groups.length === 0 && <p className="text-sm text-center text-muted-foreground py-10">Không có dữ liệu.</p>}
                {groups && groups.length > 0 && (
                    <Accordion type="single" collapsible className="w-full">
                        {groups.slice(0, 15).map((group: any, index: number) => (
                            <AccordionItem key={index} value={`item-${index}`}>
                                <AccordionTrigger><div className="flex items-center justify-between w-full pr-4"><span className="font-semibold text-left truncate max-w-md">{group.mainPrompt}</span><Badge>{group.count} lượt hỏi</Badge></div></AccordionTrigger>
                                <AccordionContent><p className="text-xs text-muted-foreground mb-2">Các biến thể khác:</p><ul className="space-y-1 text-sm list-disc pl-5">{group.variants.slice(1, 4).map((variant: any, i: number) => (<li key={i} className="text-muted-foreground">{variant.prompt} <span className="text-blue-500 text-xs">({(variant.score * 100).toFixed(1)}%)</span></li>))}{group.variants.length > 5 && <li className="text-xs">... và {group.variants.length - 5} câu hỏi khác.</li>}</ul></AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </CardContent>
        </Card>
    );
}

// --- TAB 3: Growth Charts Panel ---
function GrowthChartsPanel({ period, onPeriodChange }: { period: string, onPeriodChange: (p: string) => void }) {
    const { data, error } = useSWR(`/api/admin/dashboard?period=${period}`, fetcher);
    const [isClient, setIsClient] = useState(false);
    useEffect(() => { setIsClient(true); }, []);

    if (error) return <ErrorDisplay error={error} />;
    if (!data) return <div className="flex justify-center p-10"><Loader className="h-8 w-8 animate-spin" /></div>;

    const { charts } = data;

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div><CardTitle>Biểu đồ tăng trưởng</CardTitle><CardDescription>Sự tăng trưởng của người dùng và các cuộc trò chuyện theo thời gian.</CardDescription></div>
                    <div className="mt-4 sm:mt-0"><Select value={period} onValueChange={onPeriodChange}><SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Chọn khoảng thời gian" /></SelectTrigger><SelectContent><SelectItem value="7d">7 ngày qua</SelectItem><SelectItem value="30d">30 ngày qua</SelectItem><SelectItem value="90d">90 ngày qua</SelectItem></SelectContent></Select></div>
                </div>
            </CardHeader>
            <CardContent className="h-[400px]">
                {isClient ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={charts.userActivity}>
                            <defs><linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/><stop offset="95%" stopColor="#8884d8" stopOpacity={0}/></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "0.5rem" }} />
                            <Legend />
                            <Area type="monotone" dataKey="Người dùng mới" stroke="#8884d8" fillOpacity={1} fill="url(#colorGrowth)" />
                            <Area type="monotone" dataKey="Đoạn chat mới" stroke="#82ca9d" fillOpacity={0} />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : <div className="flex justify-center items-center h-full"><Loader className="h-8 w-8 animate-spin" /></div>}
            </CardContent>
        </Card>
    );
}


// ============================================================================
// --- MAIN ADMIN PAGE COMPONENT ---
// ============================================================================
export default function AdminPage() {
    const [period, setPeriod] = useState('7d');

    return (
        <div className="space-y-6">
            <Tabs defaultValue="kpis" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="kpis"><BarChart3 className="mr-2 h-4 w-4"/>Các chỉ số chính</TabsTrigger>
                    <TabsTrigger value="trending"><TrendingIcon className="mr-2 h-4 w-4"/>Câu hỏi phổ biến</TabsTrigger>
                    <TabsTrigger value="growth"><Users className="mr-2 h-4 w-4"/>Tăng trưởng</TabsTrigger>
                </TabsList>
                <TabsContent value="kpis" className="mt-6">
                    <MainMetricsPanel period={period} onPeriodChange={setPeriod} />
                </TabsContent>
                <TabsContent value="trending" className="mt-6">
                    <TrendingQuestionsPanel period={period} onPeriodChange={setPeriod} />
                </TabsContent>
                <TabsContent value="growth" className="mt-6">
                    <GrowthChartsPanel period={period} onPeriodChange={setPeriod} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
