"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiClientError, ApiEnvelope, BusinessProfile, CURRENCY_OPTIONS, apiRequest } from "@/lib/client";
import { useToast } from "@/components/toast";
import { PageError, PageLoader } from "@/components/ui";

type Step = 1 | 2;

export default function OnboardingPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [businessAddress, setBusinessAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [defaultTaxRate, setDefaultTaxRate] = useState("0");
  const [defaultPaymentTermsDays, setDefaultPaymentTermsDays] = useState("30");
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState("1");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiRequest<ApiEnvelope<BusinessProfile>>("/api/profile");
        if (!active) return;
        const profile = res.data;
        setBusinessName(profile.businessName);
        setLogoUrl(profile.logoUrl);
        setBusinessAddress(profile.address?.line1 ?? "");
        setPhone(profile.phone ?? "");
        setDefaultCurrency(profile.defaultCurrency);
        setDefaultTaxRate(String(profile.defaultTaxRate ?? 0));
        setDefaultPaymentTermsDays(String(profile.defaultPaymentTermsDays));
        setInvoicePrefix(profile.invoicePrefix);
        setNextInvoiceNumber(String(profile.nextInvoiceNumber));
      } catch {
        if (active) setError("Something went wrong on our end. Try again.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("logo", file);

    try {
      const res = await apiRequest<ApiEnvelope<{ logoUrl: string }>>("/api/profile/logo", {
        method: "POST",
        body: formData,
      });
      setLogoUrl(res.data.logoUrl);
      pushToast("Logo updated.");
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "FILE_TOO_LARGE") {
        setError("File exceeds the 2 MB limit. Upload a smaller image.");
      } else if (err instanceof ApiClientError && err.code === "UNSUPPORTED_MEDIA_TYPE") {
        setError("Only JPEG and PNG files are accepted.");
      } else {
        setError("Something went wrong. Try again.");
      }
    }
  }

  async function submitStep1(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!businessName.trim()) {
      setError("Business name is required.");
      return;
    }

    setSaving(true);
    try {
      await apiRequest<ApiEnvelope<BusinessProfile>>("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName }),
      });
      setStep(2);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function submitStep2(event: FormEvent, skip = false) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (!skip) {
        await apiRequest<ApiEnvelope<BusinessProfile>>("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: phone || null,
            defaultCurrency,
            defaultTaxRate: Number(defaultTaxRate) || 0,
            defaultPaymentTermsDays: Number(defaultPaymentTermsDays) || 30,
            invoicePrefix,
            nextInvoiceNumber: Math.max(1, Number(nextInvoiceNumber) || 1),
          }),
        });
      }
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6"><PageLoader /></div>;
  if (error && !businessName) return <div className="p-6"><PageError message={error} /></div>;

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-[560px] rounded-2xl border border-[#2E2E2E] bg-[#1A1A1A] p-8">
        <h1 className="text-4xl font-semibold">Set up your business</h1>
        <p className="mt-2 text-sm text-[#A0A0A0]">
          {step === 1 ? "Step 1 of 2 — Business identity" : "Step 2 of 2 — Invoicing defaults"}
        </p>
        <p className="mt-2 text-sm text-[#A0A0A0]">
          {step === 1
            ? "This information appears on every invoice you send."
            : "These defaults apply to every new invoice. You can override them any time."}
        </p>

        {step === 1 ? (
          <form className="mt-6 space-y-4" onSubmit={submitStep1}>
            <label className="block text-xs font-medium text-[#A0A0A0]">
              Business Name
              <input
                className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm"
                placeholder="Acme Studio"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                required
              />
            </label>
            <div className="rounded-xl border border-[#2E2E2E] p-4">
              <p className="text-sm text-[#F5F5F5]">{logoUrl ? "Logo uploaded" : "Upload your logo"}</p>
              <p className="mt-1 text-xs text-[#A0A0A0]">JPEG or PNG — max 2 MB</p>
              {logoUrl ? <img className="mt-3 h-14 w-14 rounded-md object-cover" src={logoUrl} alt="Logo" /> : null}
              <label className="mt-3 inline-block cursor-pointer text-sm text-[#6366F1] hover:text-[#818CF8]">
                {logoUrl ? "Change logo" : "Choose file"}
                <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={uploadLogo} />
              </label>
            </div>
            {error ? <p className="text-sm text-[#EF4444]">{error}</p> : null}
            <button className="w-full rounded-lg bg-[#6366F1] px-4 py-3 text-sm font-medium text-white" disabled={saving}>
              {saving ? "Saving..." : "Continue"}
            </button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={(event) => submitStep2(event, false)}>
            <label className="block text-xs font-medium text-[#A0A0A0]">Business Address
              <input className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm" placeholder="123 Main St" value={businessAddress} onChange={(event) => setBusinessAddress(event.target.value)} />
            </label>
            <label className="block text-xs font-medium text-[#A0A0A0]">Phone Number
              <input className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm" placeholder="+1 555 000 0000" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-xs font-medium text-[#A0A0A0]">Default Currency
                <select className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm" value={defaultCurrency} onChange={(event) => setDefaultCurrency(event.target.value)}>
                  {CURRENCY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="block text-xs font-medium text-[#A0A0A0]">Default Tax Rate (%)
                <input className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm" placeholder="0" value={defaultTaxRate} onChange={(event) => setDefaultTaxRate(event.target.value)} />
              </label>
              <label className="block text-xs font-medium text-[#A0A0A0]">Default Payment Terms (days)
                <input className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm" placeholder="30" value={defaultPaymentTermsDays} onChange={(event) => setDefaultPaymentTermsDays(event.target.value)} />
              </label>
              <label className="block text-xs font-medium text-[#A0A0A0]">Invoice Prefix
                <input className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm" placeholder="INV" value={invoicePrefix} onChange={(event) => setInvoicePrefix(event.target.value)} />
              </label>
              <label className="block text-xs font-medium text-[#A0A0A0]">Starting Invoice Number
                <input className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm" placeholder="1" value={nextInvoiceNumber} onChange={(event) => setNextInvoiceNumber(event.target.value)} />
              </label>
            </div>
            {error ? <p className="text-sm text-[#EF4444]">{error}</p> : null}
            <button className="w-full rounded-lg bg-[#6366F1] px-4 py-3 text-sm font-medium text-white" disabled={saving}>
              {saving ? "Saving..." : "Finish Setup"}
            </button>
            <button type="button" className="w-full text-sm text-[#A0A0A0] hover:text-[#F5F5F5]" onClick={(event) => submitStep2(event as unknown as FormEvent, true)}>
              Skip for now
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-[#A0A0A0]"><Link href="/dashboard" className="hover:text-[#F5F5F5]">Skip for now</Link></p>
      </div>
    </div>
  );
}
