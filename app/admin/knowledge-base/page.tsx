"use client";

import useSWR from 'swr';
import { useState, useEffect, useMemo } from 'react';
import { Loader, Plus, Edit, Trash2, Save, AlertTriangle, Search, Sparkles, Group, Merge, BarChart3, Database, FilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";


const fetcher = (url: string) => fetch(url).then(res => res.json());

// Component Modal hiển thị các câu hỏi tương đồng
function SimilarItemsModal({ item, open, onOpenChange }: { item: any, open: boolean, onOpenChange: (open: boolean) => void }) {
    const { data: similarItems, error } = useSWR(open ? `/api/admin/knowledge-base/similar/${item._id}` : null, fetcher);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                    <DialogTitle>Các câu hỏi tương đồng</DialogTitle>
                    <DialogDescription>
                        Các câu hỏi dưới đây có ý nghĩa tương tự với: <span className="font-semibold">"{item.prompt}"</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {error && <p className="text-red-500">Không thể tải dữ liệu.</p>}
                    {!similarItems && !error && <div className="flex justify-center p-4"><Loader className="h-6 w-6 animate-spin" /></div>}
                    {similarItems && similarItems.length === 0 && <p className="text-sm text-muted-foreground">Không tìm thấy câu hỏi nào tương tự.</p>}
                    {similarItems && similarItems.length > 0 && (
                        <ul className="space-y-2">
                            {similarItems.map((sim: any) => (
                                <li key={sim._id} className="text-sm p-2 border rounded-md">
                                    <p className="font-medium">{sim.prompt}</p>
                                    <p className="text-xs text-muted-foreground">Điểm tương đồng: {(sim.score * 100).toFixed(1)}%</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Component cho Tab "Quản lý"
function ManagementPanel() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    
    const { data, error, mutate } = useSWR(`/api/admin/knowledge-base?page=${page}&limit=${limit}&search=${debouncedSearchTerm}`, fetcher);
    
    // State cho Modal Thêm/Sửa
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const [itemToDelete, setItemToDelete] = useState<any>(null);
    const [selectedItemForSimilarity, setSelectedItemForSimilarity] = useState<any>(null);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setPage(1);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const items = data?.items || [];
    const totalItems = data?.total || 0;
    const totalPages = Math.ceil(totalItems / limit);

    const handleLimitChange = (value: string) => {
        setLimit(Number(value));
        setPage(1);
    };

    const openModal = (item: any | null) => {
        if (item) {
            setEditingItem(item);
            setPrompt(item.prompt);
            setResponse(item.response);
        } else {
            setEditingItem(null);
            setPrompt('');
            setResponse('');
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        const url = '/api/admin/knowledge-base';
        const method = editingItem ? 'PUT' : 'POST';
        const body = JSON.stringify(editingItem ? { id: editingItem._id, prompt, response } : { prompt, response });
        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body });
            if (!res.ok) throw new Error('Thao tác thất bại');
            mutate();
            setIsModalOpen(false); // Đóng modal sau khi thành công
        } catch (err) { console.error(err); } finally { setIsLoading(false); }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsLoading(true);
        try {
            await fetch('/api/admin/knowledge-base', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: itemToDelete._id }) });
            mutate();
        } catch (err) { console.error(err); } finally { setIsLoading(false); setItemToDelete(null); }
    };

    if (error) return <p className="text-red-500">Không thể tải dữ liệu.</p>;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Danh sách Knowledge Base</CardTitle>
                            <CardDescription>Các cặp câu hỏi-câu trả lời đã được duyệt.</CardDescription>
                        </div>
                        <Button onClick={() => openModal(null)}>
                            <Plus className="mr-2 h-4 w-4" /> Thêm mới
                        </Button>
                    </div>
                    <div className="relative mt-4">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            type="search" 
                            placeholder="Tìm kiếm theo ngữ nghĩa..." 
                            className="pl-8 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {!data ? (
                        <div className="flex justify-center items-center p-10"><Loader className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/60">
                                    <TableHead className="font-semibold">Câu hỏi</TableHead>
                                    <TableHead className="font-semibold">Câu trả lời</TableHead>
                                    <TableHead className="text-right font-semibold">Hành động</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item: any) => (
                                    <TableRow key={item._id}>
                                        <TableCell className="font-medium max-w-xs truncate">{item.prompt}</TableCell>
                                        <TableCell className="max-w-sm truncate">{item.response}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" title="Tìm tương tự" onClick={() => setSelectedItemForSimilarity(item)}><Sparkles className="h-4 w-4 text-blue-500" /></Button>
                                            <Button variant="ghost" size="icon" title="Sửa" onClick={() => openModal(item)}><Edit className="h-4 w-4" /></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" title="Xóa" onClick={() => setItemToDelete(item)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="flex items-center"><AlertTriangle className="mr-2 text-red-500" />Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
                                                        <AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                                                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>Xóa</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
                <CardFooter>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Hiển thị:</span>
                        <Select value={String(limit)} onValueChange={handleLimitChange}>
                            <SelectTrigger className="w-[70px]"><SelectValue placeholder={limit} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Trang {page} trên {totalPages}</span>
                        <div className="space-x-2">
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Trang trước</Button>
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Trang sau</Button>
                        </div>
                    </div>
                </CardFooter>
            </Card>

            {/* Modal Thêm/Sửa */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Cập nhật' : 'Thêm mới'} vào Knowledge Base</DialogTitle>
                        <DialogDescription>
                            {editingItem ? 'Chỉnh sửa cặp câu hỏi-câu trả lời.' : 'Thêm một cặp câu hỏi-câu trả lời mới vào hàng chờ duyệt.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div>
                            <label htmlFor="modal-prompt" className="block text-sm font-medium mb-1">Câu hỏi</label>
                            <Textarea id="modal-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ví dụ: Python là gì?" />
                        </div>
                        <div>
                            <label htmlFor="modal-response" className="block text-sm font-medium mb-1">Câu trả lời</label>
                            <Textarea id="modal-response" value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Ví dụ: Python là một ngôn ngữ lập trình..." rows={8} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleSubmit} disabled={!prompt || !response || isLoading}>
                            {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Lưu thay đổi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {selectedItemForSimilarity && <SimilarItemsModal item={selectedItemForSimilarity} open={!!selectedItemForSimilarity} onOpenChange={() => setSelectedItemForSimilarity(null)} />}
        </div>
    );
}

// Component cho Tab "Phân tích tương đồng"
function SimilarityReportPanel() {
    const { data: groups, error, mutate } = useSWR('/api/admin/knowledge-base/similarity-report', fetcher);
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const handleMerge = async (mainItemId: string, similarItems: any[]) => {
        setIsLoading(mainItemId);
        const similarItemIds = similarItems.map(item => item._id);
        try {
            const res = await fetch('/api/admin/knowledge-base/merge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mainItemId, similarItemIds }),
            });
            if (!res.ok) throw new Error("Gộp thất bại");
            mutate();
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(null);
        }
    };

    if (error) return <p className="text-red-500">Không thể tải báo cáo tương đồng.</p>;
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Báo cáo các câu hỏi tương đồng</CardTitle>
                <CardDescription>Các nhóm câu hỏi dưới đây có ý nghĩa tương tự nhau. Bạn có thể xem xét việc gộp chúng lại để tinh gọn Knowledge Base.</CardDescription>
            </CardHeader>
            <CardContent>
                {!groups ? <div className="flex justify-center p-10"><Loader className="h-8 w-8 animate-spin" /></div> : 
                groups.length === 0 ? <p className="text-sm text-muted-foreground">Không tìm thấy nhóm câu hỏi nào tương đồng.</p> : 
                (<Accordion type="single" collapsible className="w-full">
                    {groups.map((group: any, index: number) => (
                        <AccordionItem key={index} value={`item-${index}`}>
                            <AccordionTrigger>
                                <div className="flex items-center justify-between w-full pr-4">
                                    <span className="font-semibold truncate max-w-md">Câu hỏi chính: "{group.mainItem.prompt}"</span>
                                    <Badge>{group.similarItems.length} câu hỏi tương tự</Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <ul className="space-y-2 pt-2">
                                    {group.similarItems.map((sim: any) => (
                                        <li key={sim._id} className="text-sm p-2 border rounded-md bg-muted/50">
                                            <p className="font-medium">{sim.prompt}</p>
                                            <p className="text-xs text-green-600">Điểm tương đồng: {(sim.score * 100).toFixed(1)}%</p>
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex justify-end mt-4">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild><Button size="sm" disabled={isLoading === group.mainItem._id}>{isLoading === group.mainItem._id ? <Loader className="h-4 w-4 animate-spin" /> : <Merge className="h-4 w-4 mr-2" />}Gộp nhóm này</Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Xác nhận gộp</AlertDialogTitle><AlertDialogDescription>Hành động này sẽ xóa vĩnh viễn {group.similarItems.length} câu hỏi tương tự và chỉ giữ lại câu hỏi chính. Bạn có chắc chắn không?</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction onClick={() => handleMerge(group.mainItem._id, group.similarItems)}>Xác nhận gộp</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>)}
            </CardContent>
        </Card>
    );
}

// Component cho Tab "Thống kê"
function StatisticsPanel() {
    const [period, setPeriod] = useState('7d');
    const { data, error } = useSWR(`/api/admin/knowledge-base/stats?period=${period}`, fetcher);
    // SỬA LỖI: Thêm state để chỉ render biểu đồ ở phía client
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
      setIsClient(true);
    }, []);

    const kpis = data?.kpis;
    const chartData = data?.chartData;

    return (<Card> <CardHeader> <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between"> <div> <CardTitle>Tổng quan Knowledge Base</CardTitle> <CardDescription>Thống kê và xu hướng các cặp Q&A đã được duyệt.</CardDescription> </div> <div className="mt-4 sm:mt-0"> <Select value={period} onValueChange={setPeriod}> <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Chọn khoảng thời gian" /></SelectTrigger> <SelectContent> <SelectItem value="7d">7 ngày qua</SelectItem> <SelectItem value="30d">30 ngày qua</SelectItem> <SelectItem value="90d">90 ngày qua</SelectItem> </SelectContent> </Select> </div> </div> </CardHeader> <CardContent className="space-y-6"> <div className="grid gap-4 md:grid-cols-2"> <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">Tổng số Q&A</CardTitle> <Database className="h-4 w-4 text-muted-foreground" /> </CardHeader> <CardContent> <div className="text-2xl font-bold">{kpis ? kpis.totalApproved.toLocaleString() : <Loader className="h-6 w-6 animate-spin" />}</div> <p className="text-xs text-muted-foreground">Tổng số mục đã được duyệt</p> </CardContent> </Card> <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">Q&A Mới</CardTitle> <FilePlus className="h-4 w-4 text-muted-foreground" /> </CardHeader> <CardContent> <div className="text-2xl font-bold">+{kpis ? kpis.newApproved.toLocaleString() : <Loader className="h-6 w-6 animate-spin" />}</div> <p className="text-xs text-muted-foreground">trong {period === '7d' ? '7 ngày' : '30 ngày'} qua</p> </CardContent> </Card> </div> <div className="h-[350px]"> 
        {/* SỬA LỖI: Chỉ render biểu đồ khi isClient là true */}
        {isClient ? (
            <>
                {error && <p className="text-sm text-red-500">Không thể tải dữ liệu biểu đồ.</p>}
                {!chartData && !error && <div className="flex justify-center items-center h-full"><Loader className="h-8 w-8 animate-spin" /></div>}
                {chartData && (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs> <linearGradient id="colorNewItems" x1="0" y1="0" x2="0" y2="1"> <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/> <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/> </linearGradient> </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "0.5rem" }} />
                            <Legend />
                            <Area type="monotone" dataKey="Mục mới" stroke="#8884d8" fillOpacity={1} fill="url(#colorNewItems)" />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </>
        ) : (
            <div className="flex justify-center items-center h-full"><Loader className="h-8 w-8 animate-spin" /></div>
        )}
    </div> </CardContent> </Card>);
}


// Component Trang Admin Chính
export default function KnowledgeBasePage() {
  return (
    <div className="space-y-6">
        <Tabs defaultValue="management" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="management"><Edit className="mr-2 h-4 w-4" />Quản lý Q&A</TabsTrigger>
                <TabsTrigger value="similarity"><Group className="mr-2 h-4 w-4" />Phân tích tương đồng</TabsTrigger>
                <TabsTrigger value="statistics"><BarChart3 className="mr-2 h-4 w-4" />Thống kê</TabsTrigger>
            </TabsList>
            <TabsContent value="management" className="mt-6"><ManagementPanel /></TabsContent>
            <TabsContent value="similarity" className="mt-6"><SimilarityReportPanel /></TabsContent>
            <TabsContent value="statistics" className="mt-6"><StatisticsPanel /></TabsContent>
        </Tabs>
    </div>
  );
}
