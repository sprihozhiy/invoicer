"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthShell } from "@/components/auth-shell";
import { ApiClientError, apiRequest } from "@/lib/client";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthShell title="Set a new password" subtitle="At least 8 characters, 1 uppercase letter, and 1 number."><p className="text-sm text-[#A0A0A0]">Loading reset form...</p></AuthShell>}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}

function ResetPasswordPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Passwords don&apos;t match.");
      return;
    }

    setLoading(true);
    try {
      await apiRequest<{ success: true }>("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      router.push("/login?reset=true");
    } catch (err) {
      if (err instanceof ApiClientError && (err.code === "TOKEN_INVALID" || err.code === "TOKEN_USED")) {
        setError("This reset link has expired. Request a new one.");
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Set a new password" subtitle="At least 8 characters, 1 uppercase letter, and 1 number.">
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block text-xs font-medium text-[#A0A0A0]">
          New Password
          <input
            type="password"
            className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm"
            placeholder="Min 8 characters"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </label>
        <label className="block text-xs font-medium text-[#A0A0A0]">
          Confirm Password
          <input
            type="password"
            className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="text-sm text-[#EF4444]">{error}</p> : null}
        <button className="w-full rounded-lg bg-[#6366F1] px-4 py-3 text-sm font-medium text-white hover:bg-[#818CF8]" disabled={loading}>
          {loading ? "Saving..." : "Update Password"}
        </button>
      </form>
    </AuthShell>
  );
}
