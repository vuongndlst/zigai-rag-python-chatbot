"use client";

import { signOut, useSession } from "next-auth/react";
import ChatUI from "./components/ChatUI";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import logo from "@/app/assets/logo2.png";

export default function ChatPage() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen bg-muted/50 flex flex-col">
      {/* HEADER fixed */}
      <header className="w-full border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo + brand name */}
          <div className="flex items-center gap-2">
            <Image
              src={logo}
              alt="ZigAI logo"
              width={32}
              height={32}
              priority
              className="select-none"
            />
            <h1 className="font-bold text-lg leading-none">
              Zig&nbsp;<span className="text-primary">AI</span>
            </h1>
          </div>

          {/* User info + logout */}
          <div className="flex items-center gap-3 text-sm">
            {session?.user?.email && (
              <span className="hidden sm:inline opacity-80 truncate max-w-[10rem]">
                {session.user.email}
              </span>
            )}
            <Button variant="destructive" size="sm" onClick={() => signOut()}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* BODY */}
      <section className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl h-[calc(100vh-6rem)]">
          <ChatUI />
        </div>
      </section>
    </main>
  );
}
