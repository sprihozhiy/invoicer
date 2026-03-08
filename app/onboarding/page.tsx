"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, X, Zap } from "lucide-react";
import { requestJson, toErrorMessage } from "../_lib/api";
import { Button } from "../_components/Button";
import { Input, Label, FormGroup, FieldError, Select, Textarea } from "../_components/FormField";
import { CURRENCIES } from "../_lib/constants";

type ApiEnvelope<T> = { data: T };

export default function OnboardingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);

  // Step 1
  const [businessName, setBusinessName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [step1Errors, setStep1Errors] = useState<{ businessName?: string }>({});

  // Step 2
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [taxRate, setTaxRate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("30");
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [startingNumber, setStartingNumber] = useState("1");
  const [step2Loading, setStep2Loading] = useState(false);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  const handleLogoUpload = async (file: File) => {
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setLogoError("Only JPEG and PNG files are accepted.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("File exceeds the 2 MB limit. Upload a smaller image.");
      return;
    }

    setLogoError(null);
    setLogoLoading(true);

    const formData = new FormData();
    formData.append("logo", file);

    try {
      const res = await requestJson<ApiEnvelope<{ logoUrl: string }>>("/api/profile/logo", {
        method: "POST",
        body: formData,
      });
      setLogoUrl(res.data.logoUrl);
    } catch (err) {
      setLogoError(toErrorMessage(err));
    } finally {
      setLogoLoading(false);
    }
  };

  const handleStep1 = (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof step1Errors = {};
    if (!businessName.trim()) errs.businessName = "Business name is required.";
    if (Object.keys(errs).length > 0) {
      setStep1Errors(errs);
      return;
    }
    setStep1Errors({});
    setStep(2);
  };

  const handleStep2 = async (e: FormEvent) => {
    e.preventDefault();
    setStep2Loading(true);
    setStep2Error(null);

    try {
      await requestJson<ApiEnvelope<unknown>>("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName.trim(),
          address: address.trim() ? { line1: address.trim(), line2: null, city: "", state: null, postalCode: null, country: "" } : null,
          phone: phone.trim() || null,
          defaultCurrency: currency,
          defaultTaxRate: taxRate ? parseFloat(taxRate) : null,
          defaultPaymentTermsDays: parseInt(paymentTerms) || 30,
          invoicePrefix: invoicePrefix.trim() || "INV",
          nextInvoiceNumber: parseInt(startingNumber) || 1,
        }),
      });
      router.push("/dashboard");
    } catch (err) {
      setStep2Error(toErrorMessage(err));
    } finally {
      setStep2Loading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="w-full max-w-[480px]">
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
          {/* Header */}
          <div className="mb-6">
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--accent-primary)" }}>
              Step {step} of 2 — {step === 1 ? "Business identity" : "Invoicing defaults"}
            </p>
            <h1 className="mt-2 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Set up your business
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {step === 1
                ? "This information appears on every invoice you send."
                : "These defaults apply to every new invoice. You can override them any time."}
            </p>
          </div>

          {/* Step indicator */}
          <div className="mb-6 flex gap-2">
            {[1, 2].map((s) => (
              <div
                key={s}
                className="h-1 flex-1 rounded-full transition-colors"
                style={{
                  backgroundColor:
                    s <= step ? "var(--accent-primary)" : "var(--border-primary)",
                }}
              />
            ))}
          </div>

          {step === 1 ? (
            <form onSubmit={handleStep1} className="space-y-5">
              <FormGroup>
                <Label htmlFor="businessName" required>Business Name</Label>
                <Input
                  id="businessName"
                  placeholder="Acme Studio"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  error={step1Errors.businessName}
                />
                <FieldError message={step1Errors.businessName} />
              </FormGroup>

              {/* Logo upload */}
              <FormGroup>
                <Label>Business Logo</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                  }}
                />

                {logoUrl ? (
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt="Business logo"
                      className="h-16 w-16 rounded-lg object-contain"
                      style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-primary)" }}
                    />
                    <button
                      type="button"
                      onClick={() => setLogoUrl(null)}
                      className="text-sm transition-colors"
                      style={{ color: "var(--danger-fg)" }}
                    >
                      Remove logo
                    </button>
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
                {logoError && <FieldError message={logoError} />}
              </FormGroup>

              <Button type="submit" className="w-full" size="lg">
                Continue
              </Button>
            </form>
          ) : (
            <form onSubmit={handleStep2} className="space-y-5">
              <FormGroup>
                <Label htmlFor="address">Business Address</Label>
                <Input
                  id="address"
                  placeholder="123 Main St"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
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

              <div className="grid grid-cols-2 gap-4">
                <FormGroup>
                  <Label htmlFor="currency" required>Default Currency</Label>
                  <Select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </FormGroup>

                <FormGroup>
                  <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="0"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  />
                </FormGroup>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormGroup>
                  <Label htmlFor="paymentTerms">Payment Terms (days)</Label>
                  <Input
                    id="paymentTerms"
                    type="number"
                    min="0"
                    placeholder="30"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
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
              </div>

              <FormGroup>
                <Label htmlFor="startingNumber">Starting Invoice Number</Label>
                <Input
                  id="startingNumber"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={startingNumber}
                  onChange={(e) => setStartingNumber(e.target.value)}
                />
              </FormGroup>

              {step2Error && <FieldError message={step2Error} />}

              <div className="flex items-center gap-4">
                <Button type="submit" loading={step2Loading} className="flex-1" size="lg">
                  {step2Loading ? "Saving..." : "Finish Setup"}
                </Button>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="text-sm transition-colors hover:text-[var(--text-primary)]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Skip for now
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
