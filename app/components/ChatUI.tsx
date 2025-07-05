"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";

import Bubble from "./Bubble";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Msg = { role: "user" | "assistant"; content: string; loading?: boolean; animate?: boolean };
type ChatMeta = { _id: string; title: string; createdAt: string };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ChatUI() {
  const router = useRouter();
  const params = useSearchParams();
  const urlChatId = params.get("c");

  /* Danh sách chat (sidebar) */
  const { data: chatList = [], mutate: mutateList } = useSWR<ChatMeta[]>(
    "/api/chats",
    fetcher,
    { fallbackData: [] }
  );

  /* Nội dung chat hiện tại */
  const { data: chatDetail } = useSWR<{ chat?: { messages: Msg[] } }>(
    urlChatId ? `/api/chats/${urlChatId}` : null,
    fetcher
  );

  /* Local state */
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  /* Sync khi server trả dữ liệu */
  useEffect(() => {
    if (chatDetail?.chat?.messages) {
      setMessages(chatDetail.chat.messages);
    } else if (!urlChatId) {
      setMessages([]);
    }
  }, [chatDetail, urlChatId]);

  /* Auto-scroll */
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  /* Gửi tin nhắn */
  async function handleSend() {
    const text = input.trim();
    if (!text) return;

    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "", loading: true }, // placeholder cuối
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: text }],
          chatId: urlChatId,
        }),
      });
      if (!res.ok) throw new Error("Server error");

      const { answer, chatId: newId } = await res.json();

      /* Nếu vừa tạo chat mới */
      if (!urlChatId && newId) {
        router.replace(`/?c=${newId}`);
        mutateList(); // refresh sidebar
      } else {
        mutateList();
      }

      /* Thay placeholder bằng answer đầy đủ */
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: answer, animate: true },
      ]);
      /* ❌ KHÔNG refetch chi tiết ngay lập tức — tránh cắt chữ */
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "⚠️ Đã xảy ra lỗi, thử lại sau.", animate: true },
      ]);
    }
  }

  /* Tạo chat mới */
  function handleNewChat() {
    setMessages([]);
    router.replace("/");
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-64 border-r p-4 bg-muted/50">
        <Button variant="secondary" className="w-full" onClick={handleNewChat}>
          + Đoạn chat mới
        </Button>

        <div className="mt-4 space-y-1">
          {chatList.length === 0 ? (
            <p className="text-xs text-muted-foreground">Chưa có đoạn chat.</p>
          ) : (
            chatList.map((c) => (
              <button
                key={c._id}
                onClick={() => router.push(`/?c=${c._id}`)}
                className={`block w-full text-left px-2 py-1 rounded hover:bg-muted ${
                  c._id === urlChatId ? "bg-muted text-primary" : ""
                }`}
              >
                {c.title || "(Không tiêu đề)"}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Khung chat */}
      <Card className="flex-1 flex flex-col rounded-none shadow-xl">
        <CardContent className="flex-1 overflow-y-auto bg-background p-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-20">
              Hãy bắt đầu cuộc trò chuyện ✨
            </p>
          )}

          {messages.map((m, i) => (
            <Bubble key={i} message={m} />
          ))}
          <div ref={bottomRef} />
        </CardContent>

        <div className="border-t bg-muted/40 backdrop-blur-sm p-3 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Nhập tin nhắn..."
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!input.trim()}>
            Gửi
          </Button>
        </div>
      </Card>
    </div>
  );
}
