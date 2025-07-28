"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, KeyRound, User, Mail, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Thay thế bằng hình ảnh branding của bạn
const AuthImage = () => (
    <div className="relative h-full w-full hidden lg:block">
        <Image 
            src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop" 
            alt="Programming"
            layout="fill"
            objectFit="cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-8 left-8 text-white">
            <h2 className="text-3xl font-bold">Chào mừng đến với ZigAI</h2>
            <p className="text-lg mt-2">Trợ lý AI chuyên sâu về lập trình Python.</p>
        </div>
    </div>
);


export default function AuthPage() {
    const [activeTab, setActiveTab] = useState('login');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        const form = event.currentTarget;
        const email = (form.elements.namedItem("email") as HTMLInputElement).value;
        const password = (form.elements.namedItem("password") as HTMLInputElement).value;

        if (activeTab === 'login') {
            const result = await signIn('credentials', {
                redirect: false,
                identifier: email, // Sử dụng email làm identifier
                password,
            });

            if (result?.error) {
                setError(result.error);
            } else {
                router.push('/'); // Điều hướng đến trang chủ sau khi đăng nhập thành công
            }
        } else { // 'register'
            const username = (form.elements.namedItem("username") as HTMLInputElement).value;

            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password }),
            });

            if (res.ok) {
                // Tự động đăng nhập sau khi đăng ký thành công
                const signInResult = await signIn("credentials", {
                    identifier: username,
                    password,
                    redirect: false,
                });
                if (signInResult?.ok) {
                    router.push("/");
                } else {
                    setError(signInResult?.error || "Đăng nhập sau khi đăng ký thất bại.");
                }
            } else {
                const { message } = await res.json();
                setError(message || "Đăng ký thất bại.");
            }
        }

        setIsLoading(false);
    };

    return (
        <div className="w-full h-screen lg:grid lg:grid-cols-2">
            <AuthImage />
            <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold tracking-tight">Zig<span className="text-primary">AI</span></h1>
                        <p className="mt-2 text-muted-foreground">
                            {activeTab === 'login' ? 'Đăng nhập vào tài khoản của bạn' : 'Tạo một tài khoản mới'}
                        </p>
                    </div>

                    <Tabs defaultValue="login" className="w-full" onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="login">Đăng nhập</TabsTrigger>
                            <TabsTrigger value="register">Đăng ký</TabsTrigger>
                        </TabsList>
                        <form onSubmit={handleSubmit}>
                            <TabsContent value="login">
                                <Card className="border-0 shadow-none">
                                    <CardContent className="space-y-4 pt-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input id="email" name="email" type="email" placeholder="email@example.com" required className="pl-10" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center">
                                                <Label htmlFor="password">Mật khẩu</Label>
                                                <a href="#" className="ml-auto inline-block text-sm underline">Quên mật khẩu?</a>
                                            </div>
                                            <div className="relative">
                                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input id="password" name="password" type="password" required className="pl-10" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="register">
                                <Card className="border-0 shadow-none">
                                    <CardContent className="space-y-4 pt-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="username">Tên người dùng</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input id="username" name="username" placeholder="zigai_user" required className="pl-10" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input id="email" name="email" type="email" placeholder="email@example.com" required className="pl-10" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Mật khẩu</Label>
                                            <div className="relative">
                                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input id="password" name="password" type="password" required className="pl-10" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            
                            {error && (
                                <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive mb-4">
                                    <AlertTriangle className="h-4 w-4" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {activeTab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
                            </Button>
                        </form>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
