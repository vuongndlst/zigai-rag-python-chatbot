"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const params = useSearchParams();
  const error = params.get("error");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const identifier = (form.elements.namedItem("identifier") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    await signIn("credentials", { identifier, password, callbackUrl: "/" });
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-xl animate-fadeIn">
        <CardContent className="p-8">
          <h1 className="text-2xl font-semibold text-center mb-6">Sign&nbsp;in</h1>

          {error && (
            <p className="text-red-600 text-sm text-center mb-4">
              Invalid credentials – please try again
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input name="identifier" placeholder="Username or email" required />
            <Input name="password" type="password" placeholder="Password" required />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 flex justify-between text-sm">
            <a href="/forgot" className="text-blue-600 hover:underline">
              Forgot password?
            </a>
            <a href="/register" className="text-blue-600 hover:underline">
              Create account
            </a>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
