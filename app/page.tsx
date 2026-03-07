"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type ApiEnvelope<T> = { data: T };
type PaginatedEnvelope<T> = { data: T[]; meta: { total: number; page: number; limit: number } };
type ApiErrorBody = { error: { code: string; message: string; field?: string } };

type InvoiceStatus = "draft" | "sent" | "partial" | "paid" | "overdue" | "void";

type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  clientId: string;
  clientName: string;
  total: number;
  amountDue: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  createdAt: string;
};

type DashboardStats = {
  totalOutstanding: number;
  totalOverdue: number;
  paidThisMonth: number;
  currency: string;
  recentInvoices: InvoiceSummary[];
  overdueInvoices: InvoiceSummary[];
};

type Client = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  currency: string;
};

type CatalogItem = {
  id: string;
  name: string;
  unitPrice: number;
  taxable: boolean;
};

type BusinessProfile = {
  businessName: string;
  defaultCurrency: string;
  defaultTaxRate: number | null;
};

type NextInvoiceNumber = { invoiceNumber: string };

type AsyncState<T> = {
  loading: boolean;
  data: T | null;
  error: string | null;
};

class ApiClientError extends Error {
  status: number;
  code: string;
  field?: string;

  constructor(status: number, code: string, message: string, field?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

const statusStyles: Record<InvoiceStatus, string> = {
  draft: "text-[#A0A0A0] bg-[#1C1C1C]",
  sent: "text-[#6366F1] bg-[#1E1B4B]",
  partial: "text-[#F59E0B] bg-[#431407]",
  paid: "text-[#22C55E] bg-[#052E16]",
  overdue: "text-[#EF4444] bg-[#450A0A]",
  void: "text-[#6B6B6B] bg-[#171717]",
};

function toMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

async function requestJson<T>(url: string, init?: RequestInit, retry = true): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...init,
  });

  if (response.status === 401 && retry) {
    const refreshResponse = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (refreshResponse.ok) {
      return requestJson<T>(url, init, false);
    }
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? ((await response.json()) as T | ApiErrorBody) : null;

  if (!response.ok) {
    const body = payload as ApiErrorBody | null;
    throw new ApiClientError(
      response.status,
      body?.error?.code ?? "UNKNOWN_ERROR",
      body?.error?.message ?? "Request failed.",
      body?.error?.field,
    );
  }

  return payload as T;
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(date: string): string {
  const iso = date.includes("T") ? date : `${date}T00:00:00.000Z`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function initialState<T>(): AsyncState<T> {
  return { loading: true, data: null, error: null };
}

export default function Home() {
  const router = useRouter();

  const [profile, setProfile] = useState<AsyncState<BusinessProfile>>(initialState());
  const [dashboard, setDashboard] = useState<AsyncState<DashboardStats>>(initialState());
  const [clients, setClients] = useState<AsyncState<Client[]>>(initialState());
  const [catalog, setCatalog] = useState<AsyncState<CatalogItem[]>>(initialState());
  const [invoices, setInvoices] = useState<AsyncState<InvoiceSummary[]>>(initialState());
  const [nextNumber, setNextNumber] = useState<AsyncState<NextInvoiceNumber>>(initialState());

  const [authModal, setAuthModal] = useState<"none" | "register" | "login">("none");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const [isGuest, setIsGuest] = useState(false);

  const loadLandingData = useCallback(async () => {
    setProfile(initialState());
    setDashboard(initialState());
    setClients(initialState());
    setCatalog(initialState());
    setInvoices(initialState());
    setNextNumber(initialState());

    const resources = await Promise.allSettled([
      requestJson<ApiEnvelope<BusinessProfile>>("/api/profile"),
      requestJson<ApiEnvelope<DashboardStats>>("/api/dashboard/stats"),
      requestJson<PaginatedEnvelope<Client>>("/api/clients?page=1&limit=5"),
      requestJson<ApiEnvelope<CatalogItem[]>>("/api/catalog"),
      requestJson<PaginatedEnvelope<InvoiceSummary>>("/api/invoices?page=1&limit=5&sortBy=createdAt&sortDir=desc"),
      requestJson<ApiEnvelope<NextInvoiceNumber>>("/api/invoices/next-number"),
    ]);

    const unauthorizedCount = resources.filter(
      (result) => result.status === "rejected" && result.reason instanceof ApiClientError && result.reason.status === 401,
    ).length;
    setIsGuest(unauthorizedCount === resources.length);

    const [profileRes, dashboardRes, clientsRes, catalogRes, invoicesRes, nextNumberRes] = resources;

    if (profileRes.status === "fulfilled") {
      setProfile({ loading: false, error: null, data: profileRes.value.data });
    } else {
      setProfile({ loading: false, data: null, error: toMessage(profileRes.reason) });
    }

    if (dashboardRes.status === "fulfilled") {
      setDashboard({ loading: false, error: null, data: dashboardRes.value.data });
    } else {
      setDashboard({ loading: false, data: null, error: toMessage(dashboardRes.reason) });
    }

    if (clientsRes.status === "fulfilled") {
      setClients({ loading: false, error: null, data: clientsRes.value.data });
    } else {
      setClients({ loading: false, data: null, error: toMessage(clientsRes.reason) });
    }

    if (catalogRes.status === "fulfilled") {
      setCatalog({ loading: false, error: null, data: catalogRes.value.data });
    } else {
      setCatalog({ loading: false, data: null, error: toMessage(catalogRes.reason) });
    }

    if (invoicesRes.status === "fulfilled") {
      setInvoices({ loading: false, error: null, data: invoicesRes.value.data });
    } else {
      setInvoices({ loading: false, data: null, error: toMessage(invoicesRes.reason) });
    }

    if (nextNumberRes.status === "fulfilled") {
      setNextNumber({ loading: false, error: null, data: nextNumberRes.value.data });
    } else {
      setNextNumber({ loading: false, data: null, error: toMessage(nextNumberRes.reason) });
    }
  }, []);

  useEffect(() => {
    loadLandingData().catch(() => {
      setProfile({ loading: false, data: null, error: "Failed to load business profile." });
      setDashboard({ loading: false, data: null, error: "Failed to load dashboard stats." });
      setClients({ loading: false, data: null, error: "Failed to load clients." });
      setCatalog({ loading: false, data: null, error: "Failed to load catalog." });
      setInvoices({ loading: false, data: null, error: "Failed to load invoices." });
      setNextNumber({ loading: false, data: null, error: "Failed to load invoice number." });
    });
  }, [loadLandingData]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.15 },
    );

    const elements = document.querySelectorAll(".reveal");
    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  const heroLineItems = useMemo(() => {
    if (!catalog.data) {
      return [];
    }

    return catalog.data.slice(0, 3).map((item) => ({
      description: item.name,
      quantity: 1,
      rate: item.unitPrice,
      amount: item.unitPrice,
    }));
  }, [catalog.data]);

  const fallbackCurrency = profile.data?.defaultCurrency ?? dashboard.data?.currency ?? "USD";
  const heroTaxRate = profile.data?.defaultTaxRate ?? 0;
  const subtotal = heroLineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = Math.round((subtotal * heroTaxRate) / 100);
  const total = subtotal + taxAmount;
  const heroInvoice = invoices.data?.[0] ?? dashboard.data?.recentInvoices[0] ?? null;

  const openRegister = () => {
    setAuthModal("register");
    setRegisterError(null);
    setResetMessage(null);
  };

  const openLogin = () => {
    setAuthModal("login");
    setLoginError(null);
    setResetMessage(null);
  };

  const onRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegisterLoading(true);
    setRegisterError(null);

    try {
      await requestJson<ApiEnvelope<{ id: string }>>("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          password: registerPassword,
        }),
      });
      router.push("/onboarding");
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "EMAIL_TAKEN") {
        setRegisterError("An account with this email already exists.");
      } else {
        setRegisterError(toMessage(error));
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      await requestJson<ApiEnvelope<{ id: string }>>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "INVALID_CREDENTIALS") {
        setLoginError("Invalid email or password.");
      } else {
        setLoginError(toMessage(error));
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const onForgotPassword = async () => {
    if (!loginEmail) {
      setResetMessage("Email Address is required.");
      return;
    }

    setResetLoading(true);
    setResetMessage(null);

    try {
      await requestJson<{ success: true }>("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail }),
      });
      setResetMessage("If that email is registered, you'll receive a reset link shortly.");
    } catch {
      setResetMessage("If that email is registered, you'll receive a reset link shortly.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[color:rgba(11,11,15,0.7)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-4">
          <a href="#" className="text-2xl font-semibold tracking-tight">
            Invoicer
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]">
              Features
            </a>
            <a href="#pricing" className="text-sm text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]">
              Pricing
            </a>
            <button
              type="button"
              onClick={openLogin}
              className="text-sm text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]"
            >
              Sign In
            </button>
          </nav>
          <button
            type="button"
            onClick={openRegister}
            className="rounded-lg bg-[var(--color-accent-primary)] px-6 py-3 text-sm font-medium text-white shadow-[0_4px_20px_-5px_rgba(99,102,241,0.5)] transition hover:-translate-y-0.5 hover:bg-[var(--color-accent-hover)]"
          >
            Get Started Free
          </button>
        </div>
      </header>

      <main>
        <section className="px-6 pb-20 pt-20 md:pt-28">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center text-center">
            <p className="mb-6 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text-secondary)]">
              Free to start - no credit card required
            </p>
            <h1 className="max-w-4xl text-5xl leading-[1.1] font-semibold tracking-tight md:text-6xl lg:text-[64px]">
              Professional invoices that get paid.
            </h1>
            <p className="mt-6 max-w-3xl text-lg text-[var(--color-text-secondary)] md:text-xl">
              Invoicer is a clean, focused workspace for freelancers and small business owners. Create branded invoices,
              manage clients, and track every dollar you&apos;re owed - in one place.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={openRegister}
                className="rounded-lg bg-[var(--color-accent-primary)] px-6 py-3 text-base font-medium text-white shadow-[0_4px_20px_-5px_rgba(99,102,241,0.5)] transition hover:-translate-y-0.5 hover:bg-[var(--color-accent-hover)]"
              >
                Get Started Free
              </button>
              <a
                href="#how-it-works"
                className="rounded-lg border border-[var(--color-border)] px-6 py-3 text-base font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-elevated)]"
              >
                See how it works
              </a>
            </div>
            <p className="mt-3 text-sm font-light text-[var(--color-text-secondary)]">No credit card required. Free forever on the core plan.</p>

            <div className="mt-16 w-full max-w-4xl [perspective:2000px]">
              <div className="hero-card-enter rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-left shadow-[0_50px_100px_-30px_rgba(0,0,0,0.5)]">
                <div className="hero-row-enter flex items-start justify-between border-b border-[var(--color-border)] pb-4" style={{ animationDelay: "160ms" }}>
                  <div>
                    <p className="text-lg font-medium">{heroInvoice?.invoiceNumber ?? nextNumber.data?.invoiceNumber ?? "--"}</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Due on {formatDate(heroInvoice?.dueDate ?? new Date().toISOString().slice(0, 10))}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[heroInvoice?.status ?? "draft"]}`}
                  >
                    {(heroInvoice?.status ?? "draft").toUpperCase()}
                  </span>
                </div>

                <div className="hero-row-enter mt-4 grid grid-cols-[3fr_1fr_1fr_1fr] gap-4 border-b border-[var(--color-border)] pb-2 text-xs font-medium text-[var(--color-text-secondary)]" style={{ animationDelay: "320ms" }}>
                  <div>DESCRIPTION</div>
                  <div className="text-right">QTY</div>
                  <div className="text-right">RATE</div>
                  <div className="text-right">AMOUNT</div>
                </div>

                {catalog.loading && (
                  <p className="hero-row-enter py-5 text-sm text-[var(--color-text-secondary)]" style={{ animationDelay: "440ms" }}>
                    Loading catalog items...
                  </p>
                )}

                {!catalog.loading && catalog.error && (
                  <p className="hero-row-enter py-5 text-sm text-[var(--color-error)]" style={{ animationDelay: "440ms" }}>
                    {catalog.error}
                  </p>
                )}

                {!catalog.loading && !catalog.error && heroLineItems.length === 0 && (
                  <p className="hero-row-enter py-5 text-sm text-[var(--color-text-secondary)]" style={{ animationDelay: "440ms" }}>
                    Create your first invoice
                  </p>
                )}

                {heroLineItems.map((item, index) => (
                  <div
                    key={item.description}
                    className="hero-row-enter mt-2 grid grid-cols-[3fr_1fr_1fr_1fr] gap-4 text-sm"
                    style={{ animationDelay: `${440 + index * 100}ms` }}
                  >
                    <div className="font-medium">{item.description}</div>
                    <div className="text-right">{item.quantity}</div>
                    <div className="text-right">{formatMoney(item.rate, fallbackCurrency)}</div>
                    <div className="text-right">{formatMoney(item.amount, fallbackCurrency)}</div>
                  </div>
                ))}

                <div className="hero-row-enter mt-6 border-t border-[var(--color-border)] pt-4" style={{ animationDelay: "800ms" }}>
                  <div className="ml-auto flex w-full max-w-xs justify-between py-1 text-sm text-[var(--color-text-secondary)]">
                    <span>Subtotal</span>
                    <span>{formatMoney(subtotal, fallbackCurrency)}</span>
                  </div>
                  <div className="ml-auto flex w-full max-w-xs justify-between py-1 text-sm text-[var(--color-text-secondary)]">
                    <span>Tax ({heroTaxRate}%)</span>
                    <span>{formatMoney(taxAmount, fallbackCurrency)}</span>
                  </div>
                  <div className="ml-auto mt-2 flex w-full max-w-xs justify-between border-t border-[var(--color-border)] pt-2 text-base font-semibold">
                    <span>Total</span>
                    <span>{formatMoney(total, fallbackCurrency)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="reveal px-6 py-16 md:py-24">
          <div className="mx-auto w-full max-w-[1200px]">
            <h2 className="text-center text-4xl font-semibold md:text-5xl">Built around one goal: getting you paid.</h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
                <h3 className="text-2xl font-medium">Create in minutes</h3>
                <p className="mt-4 text-[var(--color-text-secondary)]">
                  Add your logo, pick a client, and build your line items. Your invoice is ready to send before your coffee gets
                  cold. Download a polished PDF or send it by email, right from the app.
                </p>
              </article>
              <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
                <h3 className="text-2xl font-medium">Know what you&apos;re owed</h3>
                <p className="mt-4 text-[var(--color-text-secondary)]">
                  Your dashboard shows outstanding balances, overdue invoices, and revenue collected this month. No spreadsheets.
                  No mental math. Just a clear picture of where you stand.
                </p>
              </article>
              <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
                <h3 className="text-2xl font-medium">Stay in control</h3>
                <p className="mt-4 text-[var(--color-text-secondary)]">
                  Record full or partial payments as they arrive. Invoicer updates every status automatically. Duplicate an invoice
                  in one click. Void a mistake cleanly. Your records stay accurate with no extra work.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="reveal px-6 py-16 md:py-24">
          <div className="mx-auto w-full max-w-[1200px]">
            <h2 className="text-center text-4xl font-semibold md:text-5xl">From zero to sent in five minutes.</h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-elevated)] text-lg font-semibold">1</div>
                <h3 className="text-2xl font-medium">Set up your profile</h3>
                <p className="mt-4 text-[var(--color-text-secondary)]">
                  Enter your business name and upload your logo. Set your default currency, tax rate, and payment terms. Done
                  once, applied everywhere.
                </p>
              </article>
              <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-elevated)] text-lg font-semibold">2</div>
                <h3 className="text-2xl font-medium">Build your invoice</h3>
                <p className="mt-4 text-[var(--color-text-secondary)]">
                  Select a client or create one on the spot. Add line items - or pull from your saved catalog of services and
                  prices. Totals calculate in real time. No formulas required.
                </p>
              </article>
              <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-elevated)] text-lg font-semibold">3</div>
                <h3 className="text-2xl font-medium">Send and track</h3>
                <p className="mt-4 text-[var(--color-text-secondary)]">
                  Email the invoice directly from Invoicer. As payments come in, record them against the invoice. Overdue invoices
                  surface automatically. Nothing slips through.
                </p>
              </article>
            </div>
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={openRegister}
                className="rounded-lg bg-[var(--color-accent-primary)] px-6 py-3 text-base font-medium text-white transition hover:bg-[var(--color-accent-hover)]"
              >
                Start your free account
              </button>
            </div>
          </div>
        </section>

        <section className="reveal border-y border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 md:py-24">
          <div className="mx-auto grid w-full max-w-[1200px] gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center">
            <div>
              <h2 className="text-4xl font-semibold md:text-5xl">A tool that looks as sharp as your work.</h2>
              <p className="mt-6 text-lg text-[var(--color-text-secondary)]">
                Most invoice tools look like accounting software from 2009. Invoicer ships with a single, refined dark UI - built
                to be fast, focused, and clean. No tabs you&apos;ll never use. No settings buried five menus deep. Just the features
                that matter, in a workspace you&apos;ll actually want to open.
              </p>
              <p className="mt-8 text-sm font-light uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Dark by design</p>
              <p className="mt-2 text-[var(--color-text-secondary)]">
                One theme, no toggle, no compromise. The interface is built around your content - your brand, your clients, your
                numbers.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-6">
              <h3 className="text-xl font-medium">Live workspace snapshot</h3>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Connected to `/api/dashboard/stats` and `/api/invoices`.</p>

              {isGuest && (
                <p className="mt-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-3 text-sm text-[var(--color-text-secondary)]">
                  Sign in to load your live workspace data.
                </p>
              )}

              {dashboard.loading && <p className="mt-5 text-sm text-[var(--color-text-secondary)]">Loading workspace stats...</p>}
              {!dashboard.loading && dashboard.error && <p className="mt-5 text-sm text-[var(--color-error)]">{dashboard.error}</p>}

              {!dashboard.loading && !dashboard.error && dashboard.data && (
                <>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                      <p className="text-xs text-[var(--color-text-secondary)]">Outstanding</p>
                      <p className="mt-1 text-base font-semibold">
                        {formatMoney(dashboard.data.totalOutstanding, dashboard.data.currency)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                      <p className="text-xs text-[var(--color-text-secondary)]">Overdue</p>
                      <p className="mt-1 text-base font-semibold text-[var(--color-error)]">
                        {formatMoney(dashboard.data.totalOverdue, dashboard.data.currency)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                      <p className="text-xs text-[var(--color-text-secondary)]">Paid This Month</p>
                      <p className="mt-1 text-base font-semibold text-[var(--color-success)]">
                        {formatMoney(dashboard.data.paidThisMonth, dashboard.data.currency)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Recent invoices</p>
                    {dashboard.data.recentInvoices.length === 0 ? (
                      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Create your first invoice</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {dashboard.data.recentInvoices.slice(0, 3).map((invoice) => (
                          <div
                            key={invoice.id}
                            className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium">{invoice.invoiceNumber}</p>
                              <p className="text-xs text-[var(--color-text-secondary)]">{invoice.clientName}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{formatMoney(invoice.total, invoice.currency)}</p>
                              <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusStyles[invoice.status]}`}>
                                {invoice.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section id="features" className="reveal px-6 py-16 md:py-24">
          <div className="mx-auto w-full max-w-[1200px]">
            <h2 className="text-center text-4xl font-semibold md:text-5xl">Everything a small business needs to invoice professionally.</h2>

            <div className="mt-12 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
                <h3 className="text-2xl font-medium">Every client relationship, organized.</h3>
                <p className="mt-4 text-[var(--color-text-secondary)]">
                  See total invoiced, total paid, and outstanding balance for any client - instantly. Your full invoice history with
                  them is one click away. Add clients in seconds, edit them any time.
                </p>
                {clients.loading && <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Loading clients...</p>}
                {!clients.loading && clients.error && <p className="mt-4 text-sm text-[var(--color-error)]">{clients.error}</p>}
                {!clients.loading && !clients.error && clients.data?.length === 0 && (
                  <p className="mt-4 text-sm text-[var(--color-text-secondary)]">No clients yet.</p>
                )}
                {!clients.loading && !clients.error && (clients.data?.length ?? 0) > 0 && (
                  <p className="mt-4 text-sm text-[var(--color-text-secondary)]">{clients.data?.[0]?.name} is ready for invoicing.</p>
                )}
              </article>

              <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
                <h3 className="text-2xl font-medium">Stop retyping the same line items.</h3>
                <p className="mt-4 text-[var(--color-text-secondary)]">
                  Save your services, hourly rates, and common products in your catalog. Select from the dropdown as you build an
                  invoice and the description, price, and tax settings fill in automatically.
                </p>
                {catalog.loading && <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Loading catalog...</p>}
                {!catalog.loading && catalog.error && <p className="mt-4 text-sm text-[var(--color-error)]">{catalog.error}</p>}
                {!catalog.loading && !catalog.error && catalog.data?.length === 0 && (
                  <p className="mt-4 text-sm text-[var(--color-text-secondary)]">No catalog items yet.</p>
                )}
                {!catalog.loading && !catalog.error && (catalog.data?.length ?? 0) > 0 && (
                  <p className="mt-4 text-sm text-[var(--color-text-secondary)]">{catalog.data?.length} catalog items available.</p>
                )}
              </article>

              <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
                <h3 className="text-2xl font-medium">Invoices your clients will take seriously.</h3>
                <p className="mt-4 text-[var(--color-text-secondary)]">
                  Every invoice downloads as a clean, professional PDF - complete with your logo, itemized breakdown, payment terms,
                  and notes. Paid invoices render a clear &quot;PAID&quot; stamp. No ambiguity for anyone.
                </p>
                {invoices.loading && <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Loading invoices...</p>}
                {!invoices.loading && invoices.error && <p className="mt-4 text-sm text-[var(--color-error)]">{invoices.error}</p>}
                {!invoices.loading && !invoices.error && invoices.data?.length === 0 && (
                  <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Create your first invoice</p>
                )}
                {!invoices.loading && !invoices.error && (invoices.data?.length ?? 0) > 0 && (
                  <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Latest invoice: {invoices.data?.[0]?.invoiceNumber}</p>
                )}
              </article>

              <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
                <h3 className="text-2xl font-medium">Bill clients anywhere.</h3>
                <p className="mt-4 text-[var(--color-text-secondary)]">
                  Set a different default currency per client. Invoice in USD, EUR, GBP, and 17 more. Your business default applies
                  automatically until you change it.
                </p>
                {profile.loading && <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Loading currency defaults...</p>}
                {!profile.loading && profile.error && <p className="mt-4 text-sm text-[var(--color-error)]">{profile.error}</p>}
                {!profile.loading && !profile.error && profile.data && (
                  <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Business default currency: {profile.data.defaultCurrency}</p>
                )}
              </article>

              <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 md:col-span-2 xl:col-span-2">
                <h3 className="text-2xl font-medium">Your money, at a glance.</h3>
                <p className="mt-4 text-[var(--color-text-secondary)]">
                  Total outstanding. Total overdue. Paid this month. The five most recent invoices. Every overdue invoice sorted by
                  age. One page, no guessing.
                </p>
                {dashboard.loading && <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Loading dashboard...</p>}
                {!dashboard.loading && dashboard.error && <p className="mt-4 text-sm text-[var(--color-error)]">{dashboard.error}</p>}
                {!dashboard.loading && !dashboard.error && dashboard.data && dashboard.data.overdueInvoices.length === 0 && (
                  <p className="mt-4 text-sm text-[var(--color-text-secondary)]">No overdue invoices right now.</p>
                )}
                {!dashboard.loading && !dashboard.error && dashboard.data && dashboard.data.overdueInvoices.length > 0 && (
                  <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
                    {dashboard.data.overdueInvoices.length} overdue invoices detected in {dashboard.data.currency}.
                  </p>
                )}
              </article>
            </div>
          </div>
        </section>

        <section id="pricing" className="reveal px-6 py-16 md:py-24">
          <div className="mx-auto w-full max-w-[1200px] text-center">
            <h2 className="text-4xl font-semibold md:text-5xl">Start free. Stay free.</h2>
            <p className="mt-4 text-lg text-[var(--color-text-secondary)]">No client limits. No invoice limits. No tricks.</p>

            <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-left">
              <p className="text-sm uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Free</p>
              <ul className="mt-6 space-y-3 text-[var(--color-text-secondary)]">
                <li>Unlimited invoices</li>
                <li>Unlimited clients</li>
                <li>PDF generation with your branding</li>
                <li>Dashboard with payment tracking</li>
                <li>Catalog items</li>
                <li>Multi-currency support</li>
              </ul>
              <button
                type="button"
                onClick={openRegister}
                className="mt-8 rounded-lg bg-[var(--color-accent-primary)] px-6 py-3 text-base font-medium text-white transition hover:bg-[var(--color-accent-hover)]"
              >
                Create Your Free Account
              </button>
              <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
                Premium features for teams and advanced reporting are on the roadmap. Early users get priority access.
              </p>
            </div>
          </div>
        </section>

        <section className="reveal px-6 pb-16">
          <div className="mx-auto w-full max-w-[1200px] rounded-2xl bg-gradient-to-br from-[var(--color-accent-primary)] to-[#4F46E5] p-10 text-center md:p-14">
            <h2 className="text-4xl font-semibold text-white md:text-5xl">Your clients judge your invoice before they pay it.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/85">
              Make it count. Set up Invoicer in two minutes and send your first professional invoice today.
            </p>
            <button
              type="button"
              onClick={openRegister}
              className="mt-8 rounded-lg bg-white px-6 py-3 text-base font-medium text-[var(--color-accent-primary)] transition hover:-translate-y-0.5"
            >
              Get Started Free
            </button>
            <p className="mt-3 text-sm text-white/85">No credit card required. Free forever on the core plan.</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] px-6 py-12">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <p className="text-lg font-medium">Invoicer</p>
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">Invoicer - Professional invoicing for the way you work.</p>
          </div>
          <div>
            <p className="text-sm font-medium">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li><a href="#features" className="hover:text-[var(--color-text-primary)]">Features</a></li>
              <li><a href="#pricing" className="hover:text-[var(--color-text-primary)]">Pricing</a></li>
              <li><button type="button" className="cursor-pointer hover:text-[var(--color-text-primary)]" onClick={openLogin}>Sign In</button></li>
              <li><button type="button" className="cursor-pointer hover:text-[var(--color-text-primary)]" onClick={openRegister}>Create Account</button></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium">Company</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li><a href="#" className="hover:text-[var(--color-text-primary)]">About</a></li>
              <li><a href="#" className="hover:text-[var(--color-text-primary)]">Contact</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium">Legal</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li><a href="#" className="hover:text-[var(--color-text-primary)]">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[var(--color-text-primary)]">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <p className="mx-auto mt-10 w-full max-w-[1200px] text-sm text-[var(--color-text-secondary)]">© 2026 Invoicer. All rights reserved.</p>
      </footer>

      {authModal !== "none" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-medium">{authModal === "register" ? "Create your account" : "Sign In"}</h3>
              <button
                type="button"
                onClick={() => setAuthModal("none")}
                className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)]"
              >
                Close
              </button>
            </div>

            {authModal === "register" && (
              <form onSubmit={onRegister} className="space-y-4">
                <label className="block text-sm text-[var(--color-text-secondary)]">
                  Full Name
                  <input
                    required
                    value={registerName}
                    onChange={(event) => setRegisterName(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2 text-[var(--color-text-primary)]"
                  />
                </label>
                <label className="block text-sm text-[var(--color-text-secondary)]">
                  Email Address
                  <input
                    type="email"
                    required
                    value={registerEmail}
                    onChange={(event) => setRegisterEmail(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2 text-[var(--color-text-primary)]"
                  />
                </label>
                <label className="block text-sm text-[var(--color-text-secondary)]">
                  Password - min 8 characters, 1 uppercase, 1 number
                  <input
                    type="password"
                    required
                    value={registerPassword}
                    onChange={(event) => setRegisterPassword(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2 text-[var(--color-text-primary)]"
                  />
                </label>
                {registerError && <p className="text-sm text-[var(--color-error)]">{registerError}</p>}
                <button
                  disabled={registerLoading}
                  type="submit"
                  className="w-full rounded-lg bg-[var(--color-accent-primary)] px-4 py-3 font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {registerLoading ? "Creating account..." : "Get Started Free"}
                </button>
                <button
                  type="button"
                  onClick={openLogin}
                  className="w-full text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  Don&apos;t have an account? Start free
                </button>
              </form>
            )}

            {authModal === "login" && (
              <form onSubmit={onLogin} className="space-y-4">
                <label className="block text-sm text-[var(--color-text-secondary)]">
                  Email Address
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2 text-[var(--color-text-primary)]"
                  />
                </label>
                <label className="block text-sm text-[var(--color-text-secondary)]">
                  Password
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2 text-[var(--color-text-primary)]"
                  />
                </label>
                {loginError && <p className="text-sm text-[var(--color-error)]">{loginError}</p>}
                <button
                  disabled={loginLoading}
                  type="submit"
                  className="w-full rounded-lg bg-[var(--color-accent-primary)] px-4 py-3 font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loginLoading ? "Signing in..." : "Sign In"}
                </button>
                <button
                  disabled={resetLoading}
                  type="button"
                  onClick={onForgotPassword}
                  className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-elevated)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resetLoading ? "Sending reset..." : "Forgot password?"}
                </button>
                {resetMessage && <p className="text-sm text-[var(--color-text-secondary)]">{resetMessage}</p>}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
