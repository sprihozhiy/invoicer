"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { requestJson, ApiClientError, toErrorMessage } from "../_lib/api";
import { Button } from "../_components/Button";
import { Input, Label, FormGroup, FieldError } from "../_components/FormField";

type ApiEnvelope<T> = { data: T };

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await requestJson<ApiEnvelope<{ id: string }>>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "INVALID_CREDENTIALS") {
          setError("Email or password is incorrect.");
        } else if (err.code === "TOO_MANY_REQUESTS") {
          setError("Too many sign-in attempts. Try again in a few minutes.");
        } else {
          setError(toErrorMessage(err));
        }
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="w-full max-w-[400px]">
        {/* Logo */}
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
          <h1
            className="mb-2 text-2xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Sign in to Invoicer
          </h1>

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

            <FormGroup>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </FormGroup>

            {error && (
              <FieldError message={error} />
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-sm transition-colors hover:text-[var(--text-primary)]"
                style={{ color: "var(--text-secondary)" }}
              >
                Forgot your password?
              </Link>
            </div>
          </form>
        </div>

        <p
          className="mt-6 text-center text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium transition-colors hover:text-[var(--text-primary)]"
            style={{ color: "var(--accent-primary)" }}
          >
            Start free
          </Link>
        </p>
      </div>
    </div>
  );
}
