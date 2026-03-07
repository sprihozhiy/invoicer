"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { AuthShell } from "@/components/auth-shell";
import { apiRequest } from "@/lib/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await apiRequest<{ success: true }>("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter the email you registered with and we&apos;ll send you a reset link.">
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
        {submitted ? <p className="text-sm text-[#A0A0A0]">If that email is registered, you&apos;ll receive a reset link shortly.</p> : null}
        <button className="w-full rounded-lg bg-[#6366F1] px-4 py-3 text-sm font-medium text-white hover:bg-[#818CF8]" disabled={loading}>
          {loading ? "Saving..." : "Send Reset Link"}
        </button>
        <div className="text-sm text-[#A0A0A0]">
          <Link href="/login" className="hover:text-[#F5F5F5]">Back to sign in</Link>
        </div>
      </form>
    </AuthShell>
  );
}
