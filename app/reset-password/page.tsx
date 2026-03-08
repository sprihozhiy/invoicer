"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Zap } from "lucide-react";
import { requestJson, ApiClientError, toErrorMessage } from "../_lib/api";
import { Button } from "../_components/Button";
import { Input, Label, FormGroup, FieldError } from "../_components/FormField";

function validatePassword(pwd: string): string | null {
  if (pwd.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(pwd)) return "Password must contain at least one digit.";
  return null;
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; general?: string }>({});

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    const pwdError = validatePassword(password);
    if (pwdError) newErrors.password = pwdError;
    if (password !== confirm) newErrors.confirm = "Passwords don't match.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await requestJson<{ success: true }>("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      router.push("/login?reset=1");
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "TOKEN_EXPIRED") {
          setErrors({ general: "This reset link has expired. Request a new one." });
        } else if (err.code === "TOKEN_USED") {
          setErrors({ general: "This reset link has already been used. Request a new one." });
        } else {
          setErrors({ general: toErrorMessage(err) });
        }
      } else {
        setErrors({ general: "Something went wrong. Try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div
        className="rounded-xl border p-4 text-sm"
        style={{
          backgroundColor: "var(--bg-elevated)",
          borderColor: "var(--border-primary)",
          color: "var(--danger-fg)",
        }}
      >
        Invalid reset link. Please request a new one.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5">
      <FormGroup>
        <Label htmlFor="password" required>New Password</Label>
        <Input
          id="password"
          type="password"
          required
          placeholder="Min 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="new-password"
        />
        <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
          At least 8 characters, 1 uppercase letter, and 1 number.
        </p>
        <FieldError message={errors.password} />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="confirm" required>Confirm Password</Label>
        <Input
          id="confirm"
          type="password"
          required
          placeholder="Repeat your password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          autoComplete="new-password"
        />
        <FieldError message={errors.confirm} />
      </FormGroup>

      {errors.general && <FieldError message={errors.general} />}

      <Button type="submit" loading={loading} className="w-full" size="lg">
        {loading ? "Updating..." : "Update Password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
            Set a new password
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            At least 8 characters, 1 uppercase letter, and 1 number.
          </p>
          <Suspense fallback={<p className="mt-6 text-sm" style={{ color: "var(--text-secondary)" }}>Loading...</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          <Link
            href="/login"
            className="transition-colors hover:text-[var(--text-primary)]"
            style={{ color: "var(--accent-primary)" }}
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
