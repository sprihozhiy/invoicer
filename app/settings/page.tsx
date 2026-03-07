"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";

import { AppShell } from "@/components/app-shell";
import { ApiClientError, ApiEnvelope, requestJson, toMessage } from "@/lib/client-http";

type BusinessProfile = {
  businessName: string;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  defaultCurrency: string;
  defaultTaxRate: number | null;
  defaultPaymentTermsDays: number;
  invoicePrefix: string;
  nextInvoiceNumber: number;
};

const currencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [form, setForm] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    requestJson<ApiEnvelope<BusinessProfile>>("/api/profile")
      .then((res) => setForm(res.data))
      .catch((err) => setError(toMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;

    setSaving(true);
    setSuccess(null);
    setFieldError(null);
    try {
      const body = {
        businessName: form.businessName,
        phone: form.phone,
        defaultCurrency: form.defaultCurrency,
        defaultTaxRate: form.defaultTaxRate,
        defaultPaymentTermsDays: form.defaultPaymentTermsDays,
        invoicePrefix: form.invoicePrefix,
        nextInvoiceNumber: form.nextInvoiceNumber,
      };
      const res = await requestJson<ApiEnvelope<BusinessProfile>>("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setForm(res.data);
      setSuccess("Profile updated.");
    } catch (err) {
      if (err instanceof ApiClientError && err.field) {
        setFieldError(err.message);
      } else {
        setError(toMessage(err));
      }
    } finally {
      setSaving(false);
    }
  };

  const onUploadLogo = async (file: File) => {
    setUploading(true);
    setFieldError(null);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await requestJson<ApiEnvelope<{ logoUrl: string }>>("/api/profile/logo", {
        method: "POST",
        body: formData,
      });
      setForm((current) => (current ? { ...current, logoUrl: res.data.logoUrl } : current));
      setSuccess("Profile updated.");
    } catch (err) {
      setFieldError(toMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const onRemoveLogo = async () => {
    setRemovingLogo(true);
    setFieldError(null);
    try {
      await requestJson<{ success: true }>("/api/profile/logo", { method: "DELETE" });
      setForm((current) => (current ? { ...current, logoUrl: null } : current));
      setSuccess("Logo removed.");
    } catch (err) {
      setFieldError(toMessage(err));
    } finally {
      setRemovingLogo(false);
    }
  };

  return (
    <AppShell title="Business Profile" description="Manage your business identity and invoicing defaults.">
      {loading && <p className="text-sm text-[var(--color-text-secondary)]">Loading profile...</p>}
      {!loading && error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
      {!loading && !error && form && (
        <form onSubmit={onSave} className="space-y-6">
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-lg font-medium">Business Identity</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm text-[var(--color-text-secondary)]">
                Business Name
                <input
                  required
                  value={form.businessName}
                  onChange={(event) => setForm({ ...form, businessName: event.target.value })}
                  className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2 text-[var(--color-text-primary)]"
                />
              </label>
              <label className="text-sm text-[var(--color-text-secondary)]">
                Phone Number
                <input
                  value={form.phone ?? ""}
                  onChange={(event) => setForm({ ...form, phone: event.target.value || null })}
                  className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2 text-[var(--color-text-primary)]"
                />
              </label>
            </div>
            <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-4">
              {form.logoUrl ? (
                <div className="space-y-3">
                  <Image src={form.logoUrl} alt="Business logo" width={56} height={56} className="h-14 w-14 rounded object-cover" />
                  <div className="flex gap-3">
                    <label className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]">
                      {uploading ? "Uploading..." : "Change logo"}
                      <input
                        disabled={uploading}
                        type="file"
                        accept="image/jpeg,image/png"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) onUploadLogo(file);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={removingLogo}
                      onClick={onRemoveLogo}
                      className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-surface)] disabled:opacity-60"
                    >
                      {removingLogo ? "Removing..." : "Remove logo"}
                    </button>
                  </div>
                </div>
              ) : (
                <label className="block cursor-pointer rounded-lg border border-dashed border-[var(--color-border)] px-4 py-6 text-center text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]">
                  {uploading ? "Uploading logo..." : "Upload your logo"}
                  <span className="mt-1 block text-xs text-[var(--color-text-muted)]">JPEG or PNG — max 2 MB</span>
                  <input
                    disabled={uploading}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) onUploadLogo(file);
                    }}
                  />
                </label>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-lg font-medium">Invoicing Defaults</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm text-[var(--color-text-secondary)]">
                Default Currency
                <select
                  value={form.defaultCurrency}
                  onChange={(event) => setForm({ ...form, defaultCurrency: event.target.value })}
                  className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2 text-[var(--color-text-primary)]"
                >
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-[var(--color-text-secondary)]">
                Default Tax Rate (%)
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.defaultTaxRate ?? 0}
                  onChange={(event) => setForm({ ...form, defaultTaxRate: Number(event.target.value) })}
                  className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2 text-[var(--color-text-primary)]"
                />
              </label>
              <label className="text-sm text-[var(--color-text-secondary)]">
                Default Payment Terms (days)
                <input
                  type="number"
                  min={0}
                  value={form.defaultPaymentTermsDays}
                  onChange={(event) => setForm({ ...form, defaultPaymentTermsDays: Number(event.target.value) })}
                  className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2 text-[var(--color-text-primary)]"
                />
              </label>
              <label className="text-sm text-[var(--color-text-secondary)]">
                Invoice Prefix
                <input
                  value={form.invoicePrefix}
                  onChange={(event) => setForm({ ...form, invoicePrefix: event.target.value.toUpperCase() })}
                  className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2 text-[var(--color-text-primary)]"
                />
              </label>
              <label className="text-sm text-[var(--color-text-secondary)] md:col-span-2">
                Next Invoice Number
                <input
                  type="number"
                  min={1}
                  value={form.nextInvoiceNumber}
                  onChange={(event) => setForm({ ...form, nextInvoiceNumber: Number(event.target.value) })}
                  className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2 text-[var(--color-text-primary)]"
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-lg font-medium">Account</h2>
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">Email Address</p>
            <p className="mt-1 text-sm">{form.email ?? "No email set."}</p>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">Contact support to change your email.</p>
            <a href="/forgot-password" className="mt-3 inline-block text-sm text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]">
              Change password
            </a>
          </section>

          {fieldError && <p className="text-sm text-[var(--color-error)]">{fieldError}</p>}
          {success && <p className="text-sm text-[var(--color-success)]">{success}</p>}
          <button
            disabled={saving}
            type="submit"
            className="rounded-lg bg-[var(--color-accent-primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      )}
    </AppShell>
  );
}
