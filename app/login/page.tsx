"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthShell } from "@/components/auth-shell";
import { apiRequest, ApiEnvelope, ApiClientError } from "@/lib/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiRequest<ApiEnvelope<{ id: string }>>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "INVALID_CREDENTIALS") {
        setError("Email or password is incorrect.");
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Sign in to Invoicer"
      subtitle=""
      footer={
        <p>
          Don&apos;t have an account? <Link className="text-[#6366F1] hover:text-[#818CF8]" href="/register">Start free</Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block text-xs font-medium text-[#A0A0A0]">
          Email Address
          <input
            type="email"
            className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="block text-xs font-medium text-[#A0A0A0]">
          Password
          <input
            type="password"
            className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm"
            placeholder="Your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <div className="text-right">
          <Link href="/forgot-password" className="text-sm text-[#A0A0A0] hover:text-[#F5F5F5]">Forgot your password?</Link>
        </div>
        {error ? <p className="text-sm text-[#EF4444]">{error}</p> : null}
        <button className="w-full rounded-lg bg-[#6366F1] px-4 py-3 text-sm font-medium text-white hover:bg-[#818CF8]" disabled={loading}>
          {loading ? "Saving..." : "Sign In"}
        </button>
      </form>
    </AuthShell>
  );
}
