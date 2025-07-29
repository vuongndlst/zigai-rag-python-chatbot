"use client";

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Loader, CheckCircle2, XCircle, Star, Target, ChevronDown, ChevronUp, BarChart2, ListChecks, Scale, LocateFixed, GitMerge, CopyCheck, Timer, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from "react-markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Định nghĩa các kiểu dữ liệu để code an toàn và dễ đọc hơn
interface ITestResult {
    _id: string;
    testType: string;
    question: string;
    groundTruthAnswer: string;
    chatbotAnswer: string;
    explanation: string;
    faithfulnessScore: number;
    relevanceScore: number;
    isHallucination: 'YES' | 'NO';
}

interface IBatchSummary {
    batchId: string;
    createdAt: string;
    totalTests: number;
    hallucinationRate: number;
    avgFaithfulness: number;
    avgRelevance: number;
    conclusion?: string; // Thêm trường kết luận
}

interface IAdvancedMetrics {
    precision: number;
    recall: number;
    f1Score: number;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Component hiển thị các chỉ số nâng cao (Precision, Recall, F1-Score)
function AdvancedMetricsCard({ metrics }: { metrics: IAdvancedMetrics }) {
    const formatPercent = (value: number) => isNaN(value) ? "N/A" : `${(value * 100).toFixed(1)}%`;

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="text-lg">Tóm tắt Hiệu suất Toàn diện</CardTitle>
                <CardDescription>
                    Các chỉ số tổng hợp cho toàn bộ các bài test trong lần chạy này.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <LocateFixed className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{formatPercent(metrics.precision)}</p>
                        <p className="text-sm text-muted-foreground">Precision</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                        <GitMerge className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{formatPercent(metrics.recall)}</p>
                        <p className="text-sm text-muted-foreground">Recall</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                        <Scale className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{formatPercent(metrics.f1Score)}</p>
                        <p className="text-sm text-muted-foreground">F1-Score</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Component mới để hiển thị chi tiết theo từng loại test case được chọn
function TypeSpecificMetrics({ results, selectedType }: { results: ITestResult[], selectedType: string | null }) {
    const metrics = useMemo(() => {
        if (!selectedType) return null;
        const filteredResults = results.filter(r => r.testType === selectedType);
        if (filteredResults.length === 0) return null;

        const total = filteredResults.length;
        const hallucinations = filteredResults.filter(r => r.isHallucination === 'YES').length;
        const faithfulness = filteredResults.reduce((sum, r) => sum + (r.faithfulnessScore || 0), 0) / total;
        const relevance = filteredResults.reduce((sum, r) => sum + (r.relevanceScore || 0), 0) / total;

        return {
            total,
            hallucinationRate: (hallucinations / total) * 100,
            faithfulness: faithfulness.toFixed(2),
            relevance: relevance.toFixed(2),
        };
    }, [results, selectedType]);

    if (!metrics) return null;

    return (
        <Card className="mt-4 bg-slate-50">
            <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold">{metrics.total}</p>
                        <p className="text-sm text-muted-foreground">Tổng số Test</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-red-600">{metrics.hallucinationRate.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground">Tỷ lệ Ảo giác</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-yellow-600">{metrics.faithfulness}</p>
                        <p className="text-sm text-muted-foreground">Điểm Trung thực</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-blue-600">{metrics.relevance}</p>
                        <p className="text-sm text-muted-foreground">Điểm Liên quan</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


// Component hiển thị biểu đồ chi tiết cho một batch
function BatchReportCharts({ results }: { results: ITestResult[] }) {
    const analysisData = results.reduce((acc, result) => {
        const type = result.testType;
        if (!acc[type]) {
            acc[type] = {
                name: type,
                total: 0,
                hallucinations: 0,
                totalFaithfulness: 0,
                totalRelevance: 0,
            };
        }
        acc[type].total++;
        if (result.isHallucination === 'YES') {
            acc[type].hallucinations++;
        }
        acc[type].totalFaithfulness += result.faithfulnessScore || 0;
        acc[type].totalRelevance += result.relevanceScore || 0;
        return acc;
    }, {} as Record<string, { name: string; total: number; hallucinations: number; totalFaithfulness: number; totalRelevance: number; }>);

    const chartData = Object.values(analysisData).map(d => ({
        name: (d.name || 'Không xác định').replace(/_/g, ' '),
        "Tỷ lệ ảo giác (%)": (d.hallucinations / d.total) * 100,
        "Điểm trung thực": d.totalFaithfulness / d.total,
        "Điểm liên quan": d.totalRelevance / d.total,
    }));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle className="text-lg">Tỷ lệ Ảo giác</CardTitle>
                    <CardDescription>Tỷ lệ (%) câu trả lời bị sai lệch theo từng loại.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 100]} unit="%" />
                            <YAxis dataKey="name" type="category" width={120} />
                            <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                            <Legend />
                            <Bar dataKey="Tỷ lệ ảo giác (%)" fill="#ef4444" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle className="text-lg">Điểm Trung thực</CardTitle>
                     <CardDescription>Mức độ bám sát vào kiến thức gốc (trên thang 5).</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 5]} />
                            <YAxis dataKey="name" type="category" width={120} />
                            <Tooltip formatter={(value: number) => value.toFixed(2)} />
                            <Legend />
                            <Bar dataKey="Điểm trung thực" fill="#f59e0b" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle className="text-lg">Điểm Liên quan</CardTitle>
                    <CardDescription>Mức độ trả lời đúng trọng tâm câu hỏi (trên thang 5).</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 5]} />
                            <YAxis dataKey="name" type="category" width={120} />
                            <Tooltip formatter={(value: number) => value.toFixed(2)} />
                            <Legend />
                            <Bar dataKey="Điểm liên quan" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}


// Component hiển thị chi tiết từng test case
function TestCasesDetailList({ results }: { results: ITestResult[] }) {
    return (
        <div className="space-y-4 p-4">
            {results.map((result) => (
                <Card key={result._id} className={result.isHallucination === 'YES' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}>
                    <CardHeader>
                        <CardTitle className="text-base">Câu hỏi: {result.question}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div>
                            <h4 className="font-semibold mb-1">Câu trả lời chuẩn (Ground Truth)</h4>
                            <div className="prose prose-sm max-w-none p-2 border rounded-md bg-white"><ReactMarkdown>{result.groundTruthAnswer}</ReactMarkdown></div>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-1">Câu trả lời của Chatbot</h4>
                            <div className="prose prose-sm max-w-none p-2 border rounded-md bg-white"><ReactMarkdown>{result.chatbotAnswer}</ReactMarkdown></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                            <div>
                                <h4 className="font-semibold mb-1">Đánh giá của AI Giám khảo</h4>
                                <p className="text-muted-foreground">{result.explanation}</p>
                            </div>
                            <div className="flex items-center justify-start md:justify-end gap-4">
                                <div className="text-center"><div className="font-bold text-lg">{result.faithfulnessScore}/5</div><div className="text-xs text-muted-foreground">Độ trung thực</div></div>
                                <div className="text-center"><div className="font-bold text-lg">{result.relevanceScore}/5</div><div className="text-xs text-muted-foreground">Độ liên quan</div></div>
                                <Badge variant={result.isHallucination === 'YES' ? 'destructive' : 'default'} className={result.isHallucination === 'YES' ? '' : 'bg-green-600'}>
                                    {result.isHallucination === 'YES' ? 'Ảo giác' : 'Chính xác'}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// Component cha chứa cả 2 tab Biểu đồ và Chi tiết
function ExpandedBatchView({ batchId, conclusion }: { batchId: string, conclusion?: string }) {
    const { data: results, error } = useSWR<ITestResult[]>(`/api/admin/hallucination-report?batchId=${batchId}`, fetcher);
    const [selectedTestType, setSelectedTestType] = useState<string | null>(null);

    const advancedMetrics = useMemo(() => {
        if (!results || results.length === 0) return { precision: 0, recall: 0, f1Score: 0 };

        let tp = 0, fp = 0, fn = 0;
        results.forEach((result) => {
            const hasAnswerInKb = result.groundTruthAnswer !== 'Refusal';
            const answeredCorrectly = result.isHallucination === 'NO';
            if (hasAnswerInKb && answeredCorrectly) tp++;
            else if (hasAnswerInKb && !answeredCorrectly) fp++;
            else if (!hasAnswerInKb && !answeredCorrectly) fn++;
        });

        const precision = tp / (tp + fp);
        const recall = tp / (tp + fn);
        const f1Score = 2 * (precision * recall) / (precision + recall);

        return { precision, recall, f1Score };
    }, [results]);

    const testTypes = useMemo(() => {
        if (!results) return [];
        return [...new Set(results.map((r) => r.testType).filter(Boolean))].sort() as string[];
    }, [results]);

    if (error) return <p className="text-red-500 p-4">Không thể tải chi tiết lần chạy.</p>;
    if (!results) return <div className="flex justify-center p-10"><Loader className="h-8 w-8 animate-spin" /></div>;

    return (
        <div className="p-2 border-t bg-muted/50">
            <Tabs defaultValue="charts">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="charts"><BarChart2 className="mr-2 h-4 w-4" />Phân tích & Biểu đồ</TabsTrigger>
                    <TabsTrigger value="details"><ListChecks className="mr-2 h-4 w-4" />Chi tiết Test Case</TabsTrigger>
                </TabsList>
                <TabsContent value="charts" className="p-4 space-y-6">
                    {/* NÂNG CẤP: Hiển thị kết luận */}
                    {conclusion && (
                        <Card className="bg-amber-50 border-amber-200">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center">
                                    <FileText className="mr-2 h-5 w-5" />
                                    Kết luận & Đề xuất
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="prose prose-sm max-w-none">
                                <ReactMarkdown>{conclusion}</ReactMarkdown>
                            </CardContent>
                        </Card>
                    )}
                    
                    <AdvancedMetricsCard metrics={advancedMetrics} />
                    
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Phân tích chi tiết theo Loại Test Case</CardTitle>
                            <CardDescription>Chọn một loại test case để xem các chỉ số riêng.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Select onValueChange={setSelectedTestType}>
                                <SelectTrigger className="w-[280px]">
                                    <SelectValue placeholder="Chọn một loại test case..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {testTypes.map(type => (
                                        <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <TypeSpecificMetrics results={results} selectedType={selectedTestType} />
                        </CardContent>
                    </Card>
                    
                    <BatchReportCharts results={results} />
                </TabsContent>
                <TabsContent value="details">
                    <TestCasesDetailList results={results} />
                </TabsContent>
            </Tabs>
        </div>
    );
}


export default function HallucinationReportPage() {
    const { data: batches, error } = useSWR<IBatchSummary[]>('/api/admin/hallucination-report', fetcher);
    const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

    const toggleBatchDetails = (batchId: string) => {
        setExpandedBatchId(prevId => (prevId === batchId ? null : batchId));
    };

    if (error) return <p className="text-red-500">Không thể tải báo cáo.</p>;
    if (!batches) return <div className="flex justify-center items-center p-20"><Loader className="h-10 w-10 animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Lịch sử các lần chạy Test</CardTitle>
                    <CardDescription>
                        Mỗi dòng là một lần chạy test trên toàn bộ Knowledge Base. Nhấn vào một dòng để xem chi tiết.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ngày chạy</TableHead>
                                <TableHead>Tổng số test</TableHead>
                                <TableHead>Tỷ lệ ảo giác</TableHead>
                                <TableHead>Điểm trung thực</TableHead>
                                <TableHead>Điểm liên quan</TableHead>
                                <TableHead>F1-Score</TableHead>
                                <TableHead className="text-right">Chi tiết</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {batches.map((batch) => (
                                <React.Fragment key={batch.batchId}>
                                    <TableRow onClick={() => toggleBatchDetails(batch.batchId)} className="cursor-pointer hover:bg-muted/50">
                                        <TableCell className="font-medium">{new Date(batch.createdAt).toLocaleString('vi-VN')}</TableCell>
                                        <TableCell>{batch.totalTests}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {batch.hallucinationRate > 10 ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                                <span>{batch.hallucinationRate.toFixed(1)}%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Star className="h-4 w-4 text-yellow-500" />
                                                <span>{batch.avgFaithfulness.toFixed(2)} / 5</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Target className="h-4 w-4 text-blue-500" />
                                                <span>{batch.avgRelevance.toFixed(2)} / 5</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Scale className="h-4 w-4 text-purple-500" />
                                                <span>{batch.f1Score ? `${(batch.f1Score * 100).toFixed(1)}%` : 'N/A'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">
                                                {expandedBatchId === batch.batchId ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    {expandedBatchId === batch.batchId && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="p-0">
                                                {/* NÂNG CẤP: Truyền conclusion vào component con */}
                                                <ExpandedBatchView batchId={batch.batchId} conclusion={batch.conclusion} />
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
