"use client";

import useSWR from 'swr';
import { useState, useMemo } from 'react';
import { Loader, Check, X, Inbox, TrendingUp, TrendingDown, Percent, Sparkles, HelpCircle, MessageSquare, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const ITEMS_PER_PAGE = 5;

// Component Biểu đồ và Thống kê
function ModerationStats() {
    const [period, setPeriod] = useState('7d');
    const { data: stats, error } = useSWR(`/api/admin/moderation/stats?period=${period}`, fetcher, {
        refreshInterval: 60000
    });

    const kpis = useMemo(() => {
        if (!stats || !Array.isArray(stats)) return { approved: 0, rejected: 0, rate: 0 };
        const totalApproved = stats.reduce((acc, item) => acc + item.approved, 0);
        const totalRejected = stats.reduce((acc, item) => acc + item.rejected, 0);
        const total = totalApproved + totalRejected;
        const approvalRate = total > 0 ? (totalApproved / total) * 100 : 0;
        return {
            approved: totalApproved,
            rejected: totalRejected,
            rate: approvalRate,
        };
    }, [stats]);

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Thống kê kiểm duyệt</CardTitle>
                        <CardDescription>Xu hướng các câu hỏi được duyệt và từ chối theo thời gian.</CardDescription>
                    </div>
                    <div className="mt-4 sm:mt-0">
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Chọn khoảng thời gian" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">Hôm nay</SelectItem>
                                <SelectItem value="yesterday">Hôm qua</SelectItem>
                                <SelectItem value="7d">7 ngày qua</SelectItem>
                                <SelectItem value="30d">30 ngày qua</SelectItem>
                                <SelectItem value="90d">90 ngày qua</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tổng số đã duyệt</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{kpis.approved}</div></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tổng số bị từ chối</CardTitle><TrendingDown className="h-4 w-4 text-muted-foreground text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{kpis.rejected}</div></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tỷ lệ duyệt</CardTitle><Percent className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{kpis.rate.toFixed(1)}%</div></CardContent></Card>
                </div>
                <div className="h-[350px]">
                    {error && <p className="text-sm text-red-500">Không thể tải dữ liệu biểu đồ.</p>}
                    {!stats && !error && <div className="flex justify-center items-center h-full"><Loader className="h-8 w-8 animate-spin" /></div>}
                    {stats && (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "0.5rem" }} />
                                <Legend />
                                <Line type="monotone" dataKey="approved" name="Đã duyệt" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                                <Line type="monotone" dataKey="rejected" name="Bị từ chối" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default function ModerationPage() {
    const [filter, setFilter] = useState('pending');
    const [page, setPage] = useState(1);
    const { data: responseData, error, mutate } = useSWR(`/api/admin/moderation?status=${filter}&page=${page}`, fetcher);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const items = responseData?.items || [];
    const totalItems = responseData?.total || 0;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
        setLoadingId(id);
        try {
            await fetch('/api/admin/moderation', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status }),
            });
            if (items.length === 1 && page > 1) {
                setPage(page - 1);
            } else {
                mutate();
            }
        } catch (err) {
            console.error("Failed to update status:", err);
        } finally {
            setLoadingId(null);
        }
    };

    const handleFilterChange = (value: string) => {
        setFilter(value);
        setPage(1);
    };

    if (error) return <p className="text-red-500">Không thể tải các mục cần duyệt.</p>;

    return (
        <div className="space-y-6">
            <ModerationStats />
            <Card>
                <CardHeader>
                    <CardTitle>Danh sách kiểm duyệt</CardTitle>
                    <CardDescription>Duyệt các câu trả lời do AI tạo ra.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="pending" onValueChange={handleFilterChange} className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Chờ duyệt</TabsTrigger>
                            <TabsTrigger value="approved" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Đã duyệt</TabsTrigger>
                            <TabsTrigger value="rejected" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Bị từ chối</TabsTrigger>
                            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tất cả</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    
                    {!responseData ? <div className="flex justify-center items-center p-10"><Loader className="h-8 w-8 animate-spin" /></div> :
                    items.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed rounded-lg mt-4">
                            <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-2 text-sm font-semibold text-gray-900">Không có mục nào trong bộ lọc này</h3>
                            <p className="mt-1 text-sm text-gray-500">Hãy thử chọn một bộ lọc khác.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 mt-4">
                            {items.map((item: any) => (
                                <Card key={item._id}>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Câu hỏi:</CardTitle>
                                        <p className="text-base font-normal">{item.prompt}</p>
                                    </CardHeader>
                                    <CardContent>
                                        <h3 className="text-lg font-semibold mb-2">Câu trả lời của AI:</h3>
                                        <div className="prose prose-sm max-w-none p-4 border rounded-md bg-muted/50">
                                            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{item.response}</ReactMarkdown>
                                        </div>
                                    </CardContent>
                                    {item.status === 'pending' && (
                                        <CardFooter className="flex flex-col items-start gap-4">
                                            {/* AI Suggestion Box */}
                                            {item.aiSuggestion ? (
                                                <div className="w-full rounded-md border bg-amber-50 border-amber-200 p-4">
                                                    <h4 className="mb-3 flex items-center text-sm font-semibold text-amber-900">
                                                        <Sparkles className="mr-2 h-4 w-4 text-amber-600" />
                                                        AI Đề xuất
                                                        <Badge variant={item.aiSuggestion.decision === 'approve' ? 'default' : 'destructive'} className={`ml-auto ${item.aiSuggestion.decision === 'approve' ? 'bg-green-600' : 'bg-red-600'}`}>
                                                            {item.aiSuggestion.decision === 'approve' ? 'Nên duyệt' : 'Nên từ chối'}
                                                        </Badge>
                                                    </h4>
                                                    <div className="space-y-3 text-sm">
                                                        <div className="flex items-start gap-2">
                                                            <HelpCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                                            <div><span className="font-semibold">Câu hỏi:</span> {item.aiSuggestion.reasoning.question_quality}</div>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                                            <div><span className="font-semibold">Câu trả lời:</span> {item.aiSuggestion.reasoning.answer_quality}</div>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <Link2 className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                                            <div><span className="font-semibold">Độ phù hợp:</span> {item.aiSuggestion.reasoning.relevance}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-full rounded-md border p-4 flex items-center justify-center"><Loader className="h-5 w-5 animate-spin" /></div>
                                            )}
                                            {/* Admin Action Buttons */}
                                            <div className="flex w-full justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(item._id, 'rejected')} disabled={loadingId === item._id}>
                                                    {loadingId === item._id ? <Loader className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-2 text-red-500" />}
                                                    Từ chối
                                                </Button>
                                                <Button size="sm" onClick={() => handleUpdateStatus(item._id, 'approved')} disabled={loadingId === item._id}>
                                                    {loadingId === item._id ? <Loader className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                                                    Duyệt
                                                </Button>
                                            </div>
                                        </CardFooter>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
                {totalPages > 1 && (
                    <CardFooter>
                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                                Trang {page} trên {totalPages}
                            </span>
                            <div className="space-x-2">
                                <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Trang trước</Button>
                                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Trang sau</Button>
                            </div>
                        </div>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
