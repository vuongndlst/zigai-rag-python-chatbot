"use client";
import { useEffect, useState } from "react";

type Row = { id: string; pct: number; status: "progress" | "done" | "error" };

export default function SeedProgress({ onDone }: { onDone: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const es = new EventSource("/api/admin/seed-stream", {
      method: "POST",
      body: JSON.stringify({}), // seed all pending
    } as any);

    es.onmessage = (e) => {
      const p = JSON.parse(e.data);

      if (p.type === "start")
        setRows((r) => [...r, { id: p.id, pct: 0, status: "progress" }]);

      if (p.type === "progress")
        setRows((r) =>
          r.map((row) =>
            row.id === p.id ? { ...row, pct: p.pct } : row
          )
        );

      if (p.type === "done" || p.type === "error")
        setRows((r) =>
          r.map((row) =>
            row.id === p.id ? { ...row, pct: 100, status: p.type } : row
          )
        );

      if (p.type === "allDone") {
        es.close();
        onDone();
      }
    };

    es.onerror = () => es.close();
  }, [onDone]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow w-[420px] space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold">Seeding progress</h2>

        {rows.map((row) => (
          <div key={row.id} className="space-y-1">
            <p className="text-sm">{row.id.slice(-6)}</p>
            <div className="h-2 bg-gray-200 rounded">
              <div
                className={`h-full ${
                  row.status === "error" ? "bg-red-600" : "bg-indigo-600"
                } rounded`}
                style={{ width: `${row.pct}%` }}
              />
            </div>
            <p className="text-xs text-right">{row.pct}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
