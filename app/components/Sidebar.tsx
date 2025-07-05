"use client";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

export default function Sidebar() {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR("/api/chats", (url) =>
    fetch(url).then((r) => r.json())
  );
  const chats = data?.chats ?? [];
  const params = useSearchParams();
  const active = params.get("c"); // chat id in query

  async function newChat() {
    const res = await fetch("/api/chats", { method: "POST" });
    const { chat } = await res.json();
    mutate(); // reload list
    router.push(`/?c=${chat._id}`);
  }

  return (
    <aside className="w-64 border-r bg-background/90 backdrop-blur-sm flex flex-col">
      <div className="p-3 border-b flex items-center justify-between">
        <span className="font-semibold text-sm">Chats</span>
        <Button size="icon" variant="secondary" onClick={newChat}>
          <Plus size={18} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {isLoading && (
          <div className="p-4 space-y-2">
            <Skeleton className="h-6" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        )}

        {chats.map((c: any) => (
          <button
            key={c._id}
            onClick={() => router.push(`/?c=${c._id}`)}
            className={`w-full text-left px-4 py-2 hover:bg-muted ${
              active === c._id ? "bg-muted font-medium" : ""
            }`}
          >
            {c.title || "Untitled"}
          </button>
        ))}
      </ScrollArea>
    </aside>
  );
}
