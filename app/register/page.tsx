"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { requestJson, ApiClientError, toErrorMessage } from "../_lib/api";
import { Button } from "../_components/Button";
import { Input, Label, FormGroup, FieldError } from "../_components/FormField";

type ApiEnvelope<T> = { data: T };

function validatePassword(pwd: string): string | null {
  if (pwd.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(pwd)) return "Password must contain at least one digit.";
  return null;
}

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; general?: string }>({});

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const newErrors: typeof errors = {};

    if (!name.trim()) newErrors.name = "Full name is required.";

    const pwdError = validatePassword(password);
    if (pwdError) newErrors.password = pwdError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await requestJson<ApiEnvelope<{ id: string }>>("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email, password }),
      });
      router.push("/onboarding");
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "EMAIL_TAKEN") {
          setErrors({ email: "An account with this email already exists." });
        } else if (err.code === "VALIDATION_ERROR" && err.field === "password") {
          setErrors({ password: err.message });
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
            className="mb-1 text-2xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Create your account
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Start invoicing for free. No credit card required.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            <FormGroup>
              <Label htmlFor="name" required>Full Name</Label>
              <Input
                id="name"
                type="text"
                required
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
                autoComplete="name"
              />
              <FieldError message={errors.name} />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="email" required>Email Address</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                autoComplete="email"
              />
              <FieldError message={errors.email} />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="password" required>Password</Label>
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
                Min 8 characters, 1 uppercase, 1 number
              </p>
              <FieldError message={errors.password} />
            </FormGroup>

            {errors.general && <FieldError message={errors.general} />}

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </div>

        <p
          className="mt-6 text-center text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium transition-colors hover:text-[var(--text-primary)]"
            style={{ color: "var(--accent-primary)" }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
