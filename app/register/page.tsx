"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthShell } from "@/components/auth-shell";
import { apiRequest, ApiEnvelope, ApiClientError } from "@/lib/client";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiRequest<ApiEnvelope<{ id: string }>>("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      router.push("/onboarding");
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "EMAIL_TAKEN") {
          setError("An account with this email already exists.");
        } else if (err.field === "password") {
          if (!/[A-Z]/.test(password)) {
            setError("Password must contain at least one uppercase letter.");
          } else if (!/\d/.test(password)) {
            setError("Password must contain at least one digit.");
          } else {
            setError("Password must be at least 8 characters.");
          }
        } else {
          setError("Something went wrong. Try again.");
        }
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start invoicing for free. No credit card required."
      footer={
        <p>
          Already have an account? <Link className="text-[#6366F1] hover:text-[#818CF8]" href="/login">Sign in</Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block text-xs font-medium text-[#A0A0A0]">
          Full Name
          <input
            className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm"
            placeholder="Jane Smith"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
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
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <span className="mt-2 block text-xs text-[#6B6B6B]">Min 8 characters, 1 uppercase, 1 number</span>
        </label>

        {error ? <p className="text-sm text-[#EF4444]">{error}</p> : null}

        <button className="w-full rounded-lg bg-[#6366F1] px-4 py-3 text-sm font-medium text-white hover:bg-[#818CF8]" disabled={loading}>
          {loading ? "Saving..." : "Create Account"}
        </button>
      </form>
    </AuthShell>
  );
}
