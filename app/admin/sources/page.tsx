"use client";

import { useState } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";

const SeedProgress = dynamic(() => import("./SeedProgress"), { ssr: false });

/* ------------ types ------------ */
type Source = {
  _id: string;
  type: "file" | "url";
  path: string;
  originalName?: string;
  status: "pending" | "seeded" | "error";
  chunkCount?: number;
};

/* ------------ helper ------------ */
const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function SourcesPage() {
  /* SWR load list */
  const { data, mutate, isLoading } = useSWR<{ sources: Source[] }>(
    "/api/admin/sources",
    fetcher
  );

  /* local state */
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [showProgress, setShowProgress] = useState(false);

  /* ---------- handlers ---------- */
  const upload = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    await fetch("/api/admin/upload", { method: "POST", body: fd });
    setFile(null);
    mutate();
  };

  const addUrl = async () => {
    if (!url.trim()) return;
    await fetch("/api/admin/add-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    setUrl("");
    mutate();
  };

  /* ---------- render ---------- */
  if (isLoading || !data) return <p className="p-6">Loading…</p>;

  const hasPending = data.sources.some((s) => s.status === "pending");

  return (
    <>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Data Sources</h1>

        {/* Upload file */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="file"
            accept=".pdf,.txt,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-40"
            disabled={!file}
            onClick={upload}
          >
            Upload
          </button>
          {file && <span className="text-sm text-gray-600">{file.name}</span>}
        </div>

        {/* Add URL */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            className="border px-3 py-2 rounded w-80"
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-40"
            disabled={!url.trim()}
            onClick={addUrl}
          >
            Add URL
          </button>
        </div>

        {/* Table list */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1">ID</th>
                <th>Type</th>
                <th>Name / FilePath</th>
                <th>Status</th>
                <th>Chunks</th>
              </tr>
            </thead>
            <tbody>
              {data.sources.map((s) => (
                <tr key={s._id} className="border-t">
                  <td className="px-2 py-1">{s._id.slice(-6)}</td>
                  <td>{s.type}</td>
                  <td className="truncate max-w-xs">
                    {s.originalName}
                    {s.originalName && s.originalName !== s.path && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({s.path})
                      </span>
                    )}
                  </td>
                  <td
                    className={
                      s.status === "seeded"
                        ? "text-emerald-600"
                        : s.status === "error"
                        ? "text-red-600"
                        : "text-yellow-600"
                    }
                  >
                    {s.status}
                  </td>
                  <td>{s.chunkCount ?? "-"}</td>
                </tr>
              ))}
              {data.sources.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    Chưa có nguồn nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Seed all pending */}
        <button
          className="px-5 py-2 bg-indigo-600 text-white rounded disabled:opacity-40"
          disabled={!hasPending}
          onClick={() => setShowProgress(true)}
        >
          Seed ALL pending
        </button>
      </div>

      {showProgress && (
        <SeedProgress
          onDone={() => {
            setShowProgress(false);
            mutate();
          }}
        />
      )}
    </>
  );
}
