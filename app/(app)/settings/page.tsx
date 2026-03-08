"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Upload, X, AlertCircle } from "lucide-react";
import { requestJson, ApiClientError, toErrorMessage } from "../../_lib/api";
import { Button } from "../../_components/Button";
import { Input, Label, FormGroup, FieldError, Select, Textarea } from "../../_components/FormField";
import { useToast } from "../../_components/Toast";
import { CURRENCIES } from "../../_lib/constants";
import type { BusinessProfile } from "../../_lib/types";

type ApiEnvelope<T> = { data: T };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="mb-6 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      <div
        className="rounded-2xl border p-8"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-primary)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [phone, setPhone] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [defaultTaxRate, setDefaultTaxRate] = useState("");
  const [defaultPaymentTermsDays, setDefaultPaymentTermsDays] = useState("30");
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState("1");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");

  const [fieldErrors, setFieldErrors] = useState<{ businessName?: string }>({});

  useEffect(() => {
    requestJson<ApiEnvelope<BusinessProfile>>("/api/profile")
      .then((res) => {
        const p = res.data;
        setBusinessName(p.businessName);
        setAddressLine1(p.address?.line1 ?? "");
        setPhone(p.phone ?? "");
        setDefaultCurrency(p.defaultCurrency);
        setDefaultTaxRate(p.defaultTaxRate != null ? String(p.defaultTaxRate) : "");
        setDefaultPaymentTermsDays(String(p.defaultPaymentTermsDays));
        setInvoicePrefix(p.invoicePrefix);
        setNextInvoiceNumber(String(p.nextInvoiceNumber));
        setLogoUrl(p.logoUrl);
        setUserEmail(p.email ?? "");
        setLoading(false);
      })
      .catch((err) => {
        setError(toErrorMessage(err));
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof fieldErrors = {};
    if (!businessName.trim()) errs.businessName = "Business name is required.";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setSaving(true);

    try {
      await requestJson<ApiEnvelope<BusinessProfile>>("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName.trim(),
          address: addressLine1.trim()
            ? { line1: addressLine1.trim(), line2: null, city: "", state: null, postalCode: null, country: "" }
            : null,
          phone: phone.trim() || null,
          defaultCurrency,
          defaultTaxRate: defaultTaxRate ? parseFloat(defaultTaxRate) : null,
          defaultPaymentTermsDays: parseInt(defaultPaymentTermsDays) || 30,
          invoicePrefix: invoicePrefix.trim() || "INV",
          nextInvoiceNumber: parseInt(nextInvoiceNumber) || 1,
        }),
      });
      toast("Profile updated.");
    } catch (err) {
      if (err instanceof ApiClientError && err.field === "businessName") {
        setFieldErrors({ businessName: err.message });
      } else {
        toast(toErrorMessage(err), "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast("Only JPEG and PNG files are accepted.", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("File exceeds the 2 MB limit.", "error");
      return;
    }
    setLogoLoading(true);
    const formData = new FormData();
    formData.append("logo", file);
    try {
      const res = await requestJson<ApiEnvelope<{ logoUrl: string }>>("/api/profile/logo", {
        method: "POST",
        body: formData,
      });
      setLogoUrl(res.data.logoUrl);
      toast("Logo updated.");
    } catch (err) {
      toast(toErrorMessage(err), "error");
    } finally {
      setLogoLoading(false);
    }
  };

  const handleLogoRemove = async () => {
    setLogoLoading(true);
    try {
      await requestJson<{ success: true }>("/api/profile/logo", { method: "DELETE" });
      setLogoUrl(null);
      toast("Logo removed.");
    } catch (err) {
      toast(toErrorMessage(err), "error");
    } finally {
      setLogoLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="px-8 py-8">
        <div className="h-8 w-48 animate-pulse rounded mb-6" style={{ backgroundColor: "var(--bg-elevated)" }} />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="mb-6 h-40 animate-pulse rounded-2xl" style={{ backgroundColor: "var(--bg-surface)" }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div
        className="px-8 py-6"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-primary)",
        }}
      >
        <h1 className="text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Business Profile
        </h1>
      </div>

      <div className="mx-auto max-w-[800px] px-8 py-8">
        {error && (
          <div
            className="mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
            style={{ backgroundColor: "var(--danger-bg)", borderColor: "var(--danger-fg)", color: "var(--danger-fg)" }}
          >
            <AlertCircle size={16} strokeWidth={1.5} />
            {error}
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* Business Identity */}
          <Section title="Business Identity">
            {/* Logo */}
            <div className="mb-6">
              <Label>Business Logo</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoUpload(file);
                  e.target.value = "";
                }}
              />
              {logoUrl ? (
                <div className="flex items-start gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt="Business logo"
                    className="h-20 w-20 rounded-lg object-contain"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--border-primary)",
                    }}
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={logoLoading}
                      className="text-sm transition-colors hover:text-[var(--text-primary)]"
                      style={{ color: "var(--accent-primary)" }}
                    >
                      {logoLoading ? "Uploading..." : "Change logo"}
                    </button>
                    <button
                      type="button"
                      onClick={handleLogoRemove}
                      disabled={logoLoading}
                      className="text-sm transition-colors"
                      style={{ color: "var(--danger-fg)" }}
                    >
                      Remove logo
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoLoading}
                  className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 transition-colors hover:border-[var(--accent-primary)]"
                  style={{ borderColor: "var(--border-primary)" }}
                >
                  <Upload size={20} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} />
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {logoLoading ? "Uploading..." : "Upload your logo"}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    JPEG or PNG — max 2 MB
                  </span>
                </button>
              )}
            </div>

            <FormGroup>
              <Label htmlFor="businessName" required>Business Name</Label>
              <Input
                id="businessName"
                placeholder="Acme Studio"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                error={fieldErrors.businessName}
              />
              <FieldError message={fieldErrors.businessName} />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="address">Business Address</Label>
              <Input
                id="address"
                placeholder="123 Main St"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 555 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </FormGroup>
          </Section>

          {/* Invoicing Defaults */}
          <Section title="Invoicing Defaults">
            <div className="grid grid-cols-2 gap-4">
              <FormGroup>
                <Label htmlFor="defaultCurrency" required>Default Currency</Label>
                <Select
                  id="defaultCurrency"
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </FormGroup>

              <FormGroup>
                <Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
                <Input
                  id="defaultTaxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0"
                  value={defaultTaxRate}
                  onChange={(e) => setDefaultTaxRate(e.target.value)}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="defaultPaymentTermsDays">Default Payment Terms (days)</Label>
                <Input
                  id="defaultPaymentTermsDays"
                  type="number"
                  min="0"
                  placeholder="30"
                  value={defaultPaymentTermsDays}
                  onChange={(e) => setDefaultPaymentTermsDays(e.target.value)}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                <Input
                  id="invoicePrefix"
                  placeholder="INV"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="nextInvoiceNumber">Next Invoice Number</Label>
                <Input
                  id="nextInvoiceNumber"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={nextInvoiceNumber}
                  onChange={(e) => setNextInvoiceNumber(e.target.value)}
                />
              </FormGroup>
            </div>
          </Section>

          {/* Account */}
          <Section title="Account">
            <FormGroup>
              <Label>Email Address</Label>
              <Input
                value={userEmail}
                readOnly
                className="cursor-not-allowed opacity-60"
              />
              <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                Contact support to change your email.{" "}
                <button
                  type="button"
                  className="underline transition-colors hover:text-[var(--text-primary)]"
                  style={{ color: "var(--accent-primary)" }}
                  onClick={() => {/* TODO: open change password flow */}}
                >
                  Change password
                </button>
              </p>
            </FormGroup>
          </Section>

          <div className="flex justify-end">
            <Button type="submit" loading={saving} size="lg">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
