"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";

// Icons for buttons
import { Edit, Trash2, Check, X, ShieldCheck, Mic, Languages, Send, Save, AlertTriangle } from "lucide-react";

import Bubble from "./Bubble";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


// --- TYPE DEFINITIONS & FETCHER ---
type Msg = { role: "user" | "assistant"; content: string; loading?: boolean; animate?: boolean };
type ChatMeta = { _id: string; title: string; createdAt: string };
const fetcher = (url: string) => fetch(url).then((r) => r.json());

// --- SPEECH RECOGNITION SETUP ---
const SpeechRecognition =
  (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition));


export default function ChatUI() {
  const router = useRouter();
  const params = useSearchParams();
  const urlChatId = params.get("c");
  const { data: session } = useSession();

  /* --- SWR DATA FETCHING --- */
  const { data: chatList = [], mutate: mutateList } = useSWR<ChatMeta[]>("/api/chats", fetcher, { fallbackData: [] });
  const { data: chatDetail } = useSWR<{ chat?: { messages: Msg[] } }>(urlChatId ? `/api/chats/${urlChatId}` : null, fetcher);

  /* --- LOCAL STATE --- */
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  
  // --- VOICE INPUT STATE ---
  const [isListening, setIsListening] = useState(false);
  const [recognitionLang, setRecognitionLang] = useState('vi-VN');
  const recognitionRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);


  /* --- EFFECTS --- */
  useEffect(() => { setIsClient(true); }, []);
  useEffect(() => { if (chatDetail?.chat?.messages) { setMessages(chatDetail.chat.messages); } else if (!urlChatId) { setMessages([]); } }, [chatDetail, urlChatId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (editingChatId && editInputRef.current) { editInputRef.current.focus(); editInputRef.current.select(); } }, [editingChatId]);
  useEffect(() => {
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = recognitionLang;
    recognition.onresult = (event) => { const transcript = Array.from(event.results).map(result => result[0]).map(result => result.transcript).join(''); setInput(transcript); };
    recognition.onerror = (event) => { console.error("Lỗi nhận dạng giọng nói:", event.error); };
    recognition.onend = () => { setIsListening(false); };
    recognitionRef.current = recognition;
    return () => { recognition.stop(); };
  }, [recognitionLang]);


  /* --- API & UI HANDLERS --- */
  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    const userMessage: Msg = { role: "user", content: text };
    const messagesForApi = [...messages, userMessage];
    setInput("");
    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "", loading: true }]);
    try {
        const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: messagesForApi, chatId: urlChatId }) });
        if (!res.ok) throw new Error("Server error");
        const { answer, chatId: newId } = await res.json();
        if (!urlChatId && newId) { router.replace(`/?c=${newId}`); mutateList(); }
        setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: answer, animate: true }]);
    } catch {
        setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: "⚠️ Đã xảy ra lỗi, thử lại sau.", animate: true }]);
    }
  }
  
  function handleNewChat() { if (urlChatId) { router.replace("/"); } setMessages([]); }
  const handleStartEdit = (c: ChatMeta) => { setEditingChatId(c._id); setEditingTitle(c.title); };
  const handleCancelEdit = () => { setEditingChatId(null); setEditingTitle(''); };
  
  const handleSaveTitle = async () => { 
    if (!editingChatId) return; 
    const original = chatList.find(c => c._id === editingChatId); 
    if (!original || editingTitle.trim() === original.title) { handleCancelEdit(); return; } 
    const optimisticList = chatList.map(c => c._id === editingChatId ? { ...c, title: editingTitle.trim() } : c); 
    mutateList(optimisticList, false); 
    try { 
      await fetch(`/api/chats/${editingChatId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: editingTitle.trim() }) }); 
      mutateList(); 
    } catch (err) { 
      console.error("Failed to update title:", err); 
      mutateList(chatList, false); 
    } finally { 
      handleCancelEdit(); 
    } 
  };
  
  // SỬA LỖI: Hàm xóa giờ sẽ nhận vào đối tượng chat cần xóa
  const handleDeleteChat = async (chatToDelete: ChatMeta) => { 
    if (!chatToDelete) return; 
    const id = chatToDelete._id; 
    const optimisticList = chatList.filter(c => c._id !== id); 
    mutateList(optimisticList, false); 
    if (urlChatId === id) { router.replace('/'); } 
    try { 
      await fetch(`/api/chats/${id}`, { method: 'DELETE' }); 
      mutateList(); 
    } catch (err) { 
      console.error("Failed to delete chat:", err); 
      mutateList(chatList, false); 
    } 
  };
  
  const handleToggleListening = () => { if (isListening) { recognitionRef.current?.stop(); } else { recognitionRef.current?.start(); } setIsListening(!isListening); };
  const handleToggleLanguage = () => setRecognitionLang(prev => prev === 'vi-VN' ? 'en-US' : 'vi-VN');


  /* --- RENDER --- */
  return (
    <div className="flex h-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r p-4 bg-muted/30 flex flex-col">
        <div className="flex-shrink-0"><Button variant="outline" className="w-full" onClick={handleNewChat}>+ Đoạn chat mới</Button></div>
        <div className="mt-4 space-y-1 flex-1 overflow-y-auto">{chatList.map((c) => (<div key={c._id} className="group relative rounded">{editingChatId === c._id ? (<div className="flex items-center gap-1 p-1 bg-muted"><Input ref={editInputRef} value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') handleCancelEdit(); }} onBlur={handleSaveTitle} className="h-8 flex-1" /><Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" onClick={handleSaveTitle}><Check size={16} /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={handleCancelEdit}><X size={16} /></Button></div>) : (<><button onClick={() => router.push(`/?c=${c._id}`)} className={`block w-full text-left px-3 py-2 text-sm truncate rounded hover:bg-muted ${c._id === urlChatId ? "bg-muted font-semibold" : ""}`}>{c.title || "(Không tiêu đề)"}</button><div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartEdit(c)}><Edit size={14} /></Button>
        
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500"><Trash2 size={14} /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center"><AlertTriangle className="mr-2 text-red-500" />Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
                    <AlertDialogDescription>Hành động này không thể hoàn tác. Toàn bộ nội dung của cuộc trò chuyện "{c.title}" sẽ bị xóa vĩnh viễn.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    {/* SỬA LỖI: Truyền trực tiếp đối tượng `c` vào hàm xóa */}
                    <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDeleteChat(c)}>Xóa</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        
        </div></>)}</div>))}</div>
        <div className="mt-auto pt-4 border-t border-muted/50 flex-shrink-0">{session?.user && (session.user as any).role === 'admin' && (<Button variant="ghost" className="w-full justify-start text-left" onClick={() => router.push('/admin')}><ShieldCheck className="mr-2 h-4 w-4" />Quản trị viên</Button>)}</div>
      </aside>

      {/* Main Chat Area */}
      <Card className="flex-1 grid grid-rows-[1fr_auto] rounded-none border-0 shadow-none overflow-hidden">
        <CardContent className="overflow-y-auto p-4">
          {messages.length === 0 && (<div className="flex h-full items-center justify-center"><p className="text-sm text-muted-foreground">Hãy bắt đầu cuộc trò chuyện ✨</p></div>)}
          {messages.map((m, i) => <Bubble key={i} message={m} />)}
          <div ref={bottomRef} />
        </CardContent>

        <div className="border-t bg-background p-3 flex gap-2 items-center">
          <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Hỏi ZigAI hoặc nhấn microphone để nói..." className="flex-1" disabled={messages.some(m => m.loading)} />
          {isClient && SpeechRecognition && (
            <>
              <Button variant="ghost" size="icon" onClick={handleToggleListening} className={isListening ? 'text-red-500 animate-pulse' : ''}><Mic size={20} /></Button>
              <Button variant="ghost" size="icon" onClick={handleToggleLanguage} title={`Chuyển ngôn ngữ (hiện tại: ${recognitionLang === 'vi-VN' ? 'Tiếng Việt' : 'Tiếng Anh'})`}><Languages size={20} /><span className="ml-1 text-xs font-bold">{recognitionLang === 'vi-VN' ? 'VI' : 'EN'}</span></Button>
            </>
          )}
          <Button onClick={handleSend} disabled={!input.trim() || messages.some(m => m.loading)} size="icon" className="rounded-full flex-shrink-0"><Send className="h-5 w-5" /><span className="sr-only">Gửi</span></Button>
        </div>
      </Card>
    </div>
  );
}
