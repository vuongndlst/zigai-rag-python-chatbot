"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ResetPage() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const password = (e.currentTarget.elements.namedItem("password") as any).value;
    const res = await fetch("/api/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg("Password updated. Redirecting to login…");
      setTimeout(() => router.push("/login"), 2000);
    } else {
      setMsg(data.message);
    }
    setLoading(false);
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Token missing</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl p-6 shadow-lg bg-white">
        <h1 className="text-xl font-semibold text-center mb-4">Reset Password</h1>
        {msg && <p className="text-sm mb-3">{msg}</p>}
        <form onSubmit={handleSubmit}>
          <input name="password" type="password" placeholder="New Password" className="input mb-4" required />
          <button type="submit" className="btn w-full">
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
