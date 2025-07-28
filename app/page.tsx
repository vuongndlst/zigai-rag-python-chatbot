"use client";

import { signOut, useSession } from "next-auth/react";
import ChatUI from "./components/ChatUI";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LogOut } from "lucide-react";

export default function ChatPage() {
  // Lấy cả `session` và `status` để xử lý lỗi hydration
  const { data: session, status } = useSession();

  return (
    // Đặt padding ở đây để có khoảng trống xung quanh khối chính
    <main className="h-screen w-screen bg-muted/40 p-4">
      {/* Khối chính chứa cả header và chat UI */}
      <div className="w-full h-full max-w-7xl mx-auto flex flex-col bg-background rounded-xl border shadow-sm overflow-hidden">
        {/* HEADER: Bây giờ là một phần của khối chính */}
        <header className="w-full flex-shrink-0 border-b h-16 flex items-center justify-between px-6">
          {/* Tên thương hiệu, không còn logo */}
          <h1 className="font-bold text-xl leading-none tracking-tight">
            Zig<span className="text-primary">AI</span>
          </h1>

          {/* User Info + Logout */}
          <div className="flex items-center gap-4 text-sm">
            {status === 'loading' ? (
                <div className="h-8 w-40 animate-pulse bg-muted rounded-md" />
            ) : status === "authenticated" && session.user ? (
                <>
                    <span className="hidden md:inline text-muted-foreground font-medium">
                        {session.user.email}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => signOut()}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Đăng xuất
                    </Button>
                </>
            ) : (
                <div className="h-8 w-24"></div>
            )}
          </div>
        </header>

        {/* BODY: ChatUI sẽ chiếm toàn bộ không gian còn lại */}
        <div className="flex-1 overflow-y-auto">
          <ChatUI />
        </div>
      </div>
    </main>
  );
}
