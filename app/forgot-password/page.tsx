"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import { requestJson } from "../_lib/api";
import { Button } from "../_components/Button";
import { Input, Label, FormGroup } from "../_components/FormField";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await requestJson<{ success: true }>("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Always show success to prevent user enumeration
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="w-full max-w-[400px]">
        <div className="mb-10 flex justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            <Zap size={20} strokeWidth={1.5} style={{ color: "var(--accent-primary)" }} />
            Invoicer
          </Link>
        </div>

        <div
          className="rounded-2xl border p-8"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-primary)",
          }}
        >
          <h1 className="mb-1 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Reset your password
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Enter the email you registered with and we&apos;ll send you a reset link.
          </p>

          {submitted ? (
            <div
              className="mt-6 rounded-xl border p-4 text-sm"
              style={{
                backgroundColor: "var(--bg-elevated)",
                borderColor: "var(--border-primary)",
                color: "var(--text-secondary)",
              }}
            >
              If that email is registered, you&apos;ll receive a reset link shortly.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-5">
              <FormGroup>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </FormGroup>

              <Button type="submit" loading={loading} className="w-full" size="lg">
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-sm transition-colors hover:text-[var(--text-primary)]"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
