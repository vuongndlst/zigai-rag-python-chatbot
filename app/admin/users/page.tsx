"use client";

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link'; // Thêm import cho Link
import { Loader, Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function UsersPage() {
    const { data, error, mutate } = useSWR('/api/admin/users', fetcher);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [role, setRole] = useState('user');
    const [isActive, setIsActive] = useState(true);

    if (error) return <p className="text-red-500">Failed to load users.</p>;
    if (!data) return <div className="flex justify-center items-center p-10"><Loader className="h-8 w-8 animate-spin" /></div>;

    const users = Array.isArray(data) ? data : [];

    const startEdit = (u: any) => {
        setEditingId(u._id);
        setRole(u.role);
        setIsActive(u.isActive);
    };
    
    const cancelEdit = () => {
        setEditingId(null);
    };

    const save = async () => {
        if (!editingId) return;
        await fetch('/api/admin/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingId, role, isActive }),
        });
        setEditingId(null);
        mutate(); // Re-fetch data to show changes
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Quản lý người dùng</CardTitle>
                <CardDescription>
                    Xem và chỉnh sửa vai trò, trạng thái của người dùng trong hệ thống.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Username</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Vai trò</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead className="text-right">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length > 0 ? (
                            users.map((u: any) => (
                                <TableRow key={u._id}>
                                    <TableCell className="font-medium">
                                        {/* Bọc tên người dùng bằng Link */}
                                        <Link href={`/admin/users/${u._id}`} className="hover:underline text-primary">
                                            {u.username}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell>
                                        {editingId === u._id ? (
                                            <Select value={role} onValueChange={setRole}>
                                                <SelectTrigger className="w-[120px]">
                                                    <SelectValue placeholder="Chọn vai trò" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="user">User</SelectItem>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                                                {u.role}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingId === u._id ? (
                                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                                        ) : (
                                            <Badge variant={u.isActive ? 'outline' : 'destructive'}>
                                              {u.isActive ? 'Hoạt động' : 'Vô hiệu'}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {editingId === u._id ? (
                                            <div className="flex gap-2 justify-end">
                                                <Button size="sm" onClick={save}><Save className="h-4 w-4 mr-1" /> Lưu</Button>
                                                <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="h-4 w-4 mr-1" /> Hủy</Button>
                                            </div>
                                        ) : (
                                            <Button size="sm" variant="outline" onClick={() => startEdit(u)}>
                                                <Edit className="h-4 w-4 mr-1" /> Sửa
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground">
                                    Không có dữ liệu người dùng.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
