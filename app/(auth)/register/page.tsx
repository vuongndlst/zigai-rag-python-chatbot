"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    const form = e.currentTarget;
    const username = (form.elements.namedItem("username") as HTMLInputElement).value;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    if (res.ok) {
      await signIn("credentials", { identifier: username, password, callbackUrl: "/" });
    } else {
      const { message } = await res.json();
      setMsg(message || "Registration failed");
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-xl animate-fadeIn">
        <CardContent className="p-8">
          <h1 className="text-2xl font-semibold text-center mb-6">Create&nbsp;account</h1>

          {msg && <p className="text-red-600 text-sm text-center mb-4">{msg}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input name="username" placeholder="Username" required />
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="password" type="password" placeholder="Password" required />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating…" : "Sign up"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm">
            Already have an account?{" "}
            <a href="/login" className="text-blue-600 hover:underline">
              Sign in
            </a>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
