"use client";

import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Loader, MessageSquare, User as UserIcon, Hash, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import Bubble from '@/app/components/Bubble'; // Đảm bảo đường dẫn này đúng

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function UserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data, error } = useSWR(id ? `/api/admin/users/${id}` : null, fetcher);

    if (error) return <p className="text-red-500">Failed to load user details.</p>;
    if (!data) return <div className="flex justify-center items-center p-10"><Loader className="h-8 w-8 animate-spin" /></div>;

    const { user, chats, tokenStats } = data;

    return (
        <div className="space-y-6">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <UserIcon />
                        {user.username}
                    </CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <h4 className="font-semibold text-sm">Vai trò</h4>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge>
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm">Trạng thái</h4>
                        <Badge variant={user.isActive ? 'outline' : 'destructive'}>{user.isActive ? 'Hoạt động' : 'Vô hiệu'}</Badge>
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm">Ngày tạo</h4>
                        <p>{new Date(user.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><Hash /> Thống kê sử dụng</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <h4 className="font-semibold text-sm">Tổng số đoạn chat</h4>
                        <p className="text-2xl font-bold">{chats.length}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm">Tổng số token</h4>
                        <p className="text-2xl font-bold">{tokenStats.totalTokens.toLocaleString('vi-VN')}</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-sm">Chi tiết</h4>
                        <p className="text-xs text-muted-foreground">Prompt: {tokenStats.totalPromptTokens.toLocaleString('vi-VN')}</p>
                        <p className="text-xs text-muted-foreground">Completion: {tokenStats.totalCompletionTokens.toLocaleString('vi-VN')}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><MessageSquare /> Lịch sử trò chuyện</CardTitle>
                </CardHeader>
                <CardContent>
                    {chats.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {chats.map((chat: any) => (
                                <AccordionItem key={chat._id} value={chat._id}>
                                    <AccordionTrigger>{chat.title || "(Không có tiêu đề)"}</AccordionTrigger>
                                    <AccordionContent className="p-2 bg-muted/50 rounded-md">
                                        <div className="max-h-96 overflow-y-auto pr-2">
                                            {chat.messages.map((message: any, index: number) => (
                                                <Bubble key={index} message={message} />
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <p className="text-center text-muted-foreground">Người dùng này chưa có đoạn chat nào.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
