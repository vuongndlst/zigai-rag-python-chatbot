"use client";
import { useState } from "react";

export default function ForgotPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const email = (e.currentTarget.elements.namedItem("email") as any).value;
    const res = await fetch("/api/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg("If that email exists, we have sent reset instructions (check console).");
    } else {
      setMsg(data.message);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl p-6 shadow-lg bg-white">
        <h1 className="text-xl font-semibold text-center mb-4">Forgot Password</h1>
        {msg && <p className="text-sm mb-3">{msg}</p>}
        <form onSubmit={handleSubmit}>
          <input name="email" type="email" placeholder="Email" className="input mb-4" required />
          <button type="submit" className="btn w-full">
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <p className="text-sm mt-4 text-center">
          <a href="/login" className="link">Back to login</a>
        </p>
      </div>
    </div>
  );
}
