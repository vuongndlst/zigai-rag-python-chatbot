"use client";

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import "highlight.js/styles/github-dark.css";
import assistantLogo from "@/app/assets/logo2.png";

type Source = { id: string; snippet: string };

type Props = {
  message: {
    role: "user" | "assistant";
    content: string;
    sources?: Source[];
    loading?: boolean;
    animate?: boolean;
  };
};

const avatarMap = {
  user: "https://cdn-icons-png.flaticon.com/512/1144/1144760.png",
  assistant: assistantLogo.src,
};

export default function Bubble({ message }: Props) {
  const { role, content, sources = [], loading, animate } = message;
  const [displayedText, setDisplayedText] = useState("");

  /* Typewriter */
  useEffect(() => {
    if (animate && !loading) {
      let i = 0;
      const id = setInterval(() => {
        setDisplayedText((prev) => prev + content.charAt(i));
        i++;
        if (i >= content.length) clearInterval(id);
      }, 10);
      return () => clearInterval(id);
    } else {
      setDisplayedText(content);
    }
  }, [content, animate, loading]);

  /* Replace [^n] → tooltip sup */
  const injectCitations = (text: string) =>
    text.replace(/\[\^(\d+)\]/g, (_, n) => {
      const idx = Number(n) - 1;
      const src = sources[idx];
      if (!src) return `[${n}]`;

      // Tooltip via Tailwind group-hover
      return `
        <span class="relative group cursor-help inline-block">
          <sup>[${n}]</sup>
          <span
            class="absolute z-10 left-1/2 -translate-x-1/2 mt-1 w-60
                   rounded-md bg-gray-800 text-white text-xs px-3 py-2
                   opacity-0 group-hover:opacity-100 transition-opacity">
            ${src.snippet.replace(/"/g, "&quot;")}
          </span>
        </span>`;
    });

  const rendered = injectCitations(animate ? displayedText : content);

  return (
    <div
      className={`flex gap-3 my-4 max-w-[85%] ${
        role === "user" ? "ml-auto flex-row-reverse" : ""
      }`}
    >
      {/* Avatar */}
      <img
        src={avatarMap[role]}
        alt={role}
        className="w-8 h-8 rounded-full object-cover shadow border"
      />

      {/* Bubble */}
      <div
        className={`prose prose-sm sm:prose-base rounded-xl px-4 py-3 transition-all
          ${
            role === "user"
              ? "bg-[#F0A8D0] text-white"
              : "bg-[#F7F7F8] text-gray-800"
          }`}
      >
        {loading ? (
          <div className="animate-pulse text-sm font-mono text-gray-500">
            Đang trả lời...
          </div>
        ) : (
          <>
            <ReactMarkdown
              rehypePlugins={[rehypeHighlight, rehypeRaw]}
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="my-2">{children}</p>,
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="font-mono text-[0.95em] px-1">{children}</code>
                  ) : (
                    <pre className="bg-[#1e1e1e] text-white p-4 rounded-lg overflow-x-auto text-sm leading-relaxed my-2">
                      <code className={className}>{children}</code>
                    </pre>
                  );
                },
              }}
            >
              {rendered}
            </ReactMarkdown>

            {/* Footnotes */}
            {sources.length > 0 && (
              <ol className="mt-3 border-t pt-2 text-xs space-y-1">
                {sources.map((s, i) => (
                  <li key={s.id} id={`src-${i + 1}`}>
                    [{i + 1}] {s.snippet}
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </div>
  );
}
