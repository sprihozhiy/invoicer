"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Zap, Check, Menu, X } from "lucide-react";
import { requestJson } from "./_lib/api";
import { formatMoney, formatDate } from "./_lib/format";
import type {
  InvoiceStatus,
  DashboardStats,
  InvoiceSummary,
  CatalogItem,
  BusinessProfile,
  AsyncState,
} from "./_lib/types";
import { initialState } from "./_lib/types";
import { STATUS_STYLES } from "./_lib/constants";

type ApiEnvelope<T> = { data: T };
type PaginatedEnvelope<T> = { data: T[]; meta: { total: number; page: number; limit: number } };

function StatusPill({ status }: { status: InvoiceStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-medium capitalize"
      style={{ color: s.fg, backgroundColor: s.bg }}
    >
      {status}
    </span>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboard, setDashboard] = useState<AsyncState<DashboardStats>>(initialState());
  const [catalog, setCatalog] = useState<AsyncState<CatalogItem[]>>(initialState());
  const [invoices, setInvoices] = useState<AsyncState<InvoiceSummary[]>>(initialState());
  const [profile, setProfile] = useState<AsyncState<BusinessProfile>>(initialState());
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      requestJson<ApiEnvelope<DashboardStats>>("/api/dashboard/stats"),
      requestJson<ApiEnvelope<CatalogItem[]>>("/api/catalog"),
      requestJson<PaginatedEnvelope<InvoiceSummary>>(
        "/api/invoices?page=1&limit=5&sortBy=createdAt&sortDir=desc",
      ),
      requestJson<ApiEnvelope<BusinessProfile>>("/api/profile"),
    ]).then(([d, c, i, p]) => {
      const allFailed = [d, c, i, p].every((r) => r.status === "rejected");
      setIsGuest(allFailed);

      if (d.status === "fulfilled")
        setDashboard({ loading: false, data: d.value.data, error: null });
      else setDashboard({ loading: false, data: null, error: null });

      if (c.status === "fulfilled")
        setCatalog({ loading: false, data: c.value.data, error: null });
      else setCatalog({ loading: false, data: null, error: null });

      if (i.status === "fulfilled")
        setInvoices({ loading: false, data: i.value.data, error: null });
      else setInvoices({ loading: false, data: null, error: null });

      if (p.status === "fulfilled")
        setProfile({ loading: false, data: p.value.data, error: null });
      else setProfile({ loading: false, data: null, error: null });
    });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("is-visible");
        }),
      { threshold: 0.12 },
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const fallbackCurrency =
    profile.data?.defaultCurrency ?? dashboard.data?.currency ?? "USD";
  const heroTaxRate = profile.data?.defaultTaxRate ?? 0;

  const heroLineItems = useMemo(() => {
    if (!catalog.data || catalog.data.length === 0) return null;
    return catalog.data.slice(0, 3).map((item) => ({
      description: item.name,
      quantity: 1,
      unitPrice: item.unitPrice,
    }));
  }, [catalog.data]);

  const fallbackItems = [
    { description: "Design system audit", quantity: 1, unitPrice: 150000 },
    { description: "Frontend development", quantity: 1, unitPrice: 800000 },
    { description: "QA & handover", quantity: 1, unitPrice: 60000 },
  ];

  const displayItems = heroLineItems ?? fallbackItems;
  const subtotal = displayItems.reduce((s, i) => s + i.unitPrice, 0);
  const taxAmount = Math.round((subtotal * heroTaxRate) / 100);
  const total = subtotal + taxAmount;

  const heroInvoice = invoices.data?.[0] ?? dashboard.data?.recentInvoices[0] ?? null;

  const navLinkStyle: React.CSSProperties = { color: "var(--text-secondary)" };

  return (
    <div
      className="landing-bg min-h-screen"
      style={{ color: "var(--text-primary)", backgroundColor: "var(--bg-primary)" }}
    >
      {/* ── Navigation ── */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: "rgba(15,15,15,0.85)",
          borderColor: "var(--border-primary)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="mx-auto flex h-[72px] w-full max-w-[1280px] items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            <Zap
              size={20}
              strokeWidth={1.5}
              style={{ color: "var(--accent-primary)" }}
            />
            Invoicer
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {["#features", "#how-it-works", "#pricing"].map((href, idx) => (
              <a
                key={href}
                href={href}
                className="text-sm font-medium transition-colors hover:text-[var(--text-primary)]"
                style={navLinkStyle}
              >
                {["Features", "How It Works", "Pricing"][idx]}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/login"
              className="text-sm font-medium transition-colors hover:text-[var(--text-primary)]"
              style={navLinkStyle}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-[var(--accent-hover)]"
              style={{ backgroundColor: "var(--accent-primary)" }}
            >
              Get Started Free
            </Link>
          </div>

          <button
            className="rounded-lg p-2 md:hidden"
            style={{ color: "var(--text-primary)" }}
            onClick={() => setMobileMenuOpen((p) => !p)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? (
              <X size={22} strokeWidth={1.5} />
            ) : (
              <Menu size={22} strokeWidth={1.5} />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div
            className="flex flex-col gap-4 px-6 pb-6 md:hidden"
            style={{
              borderTop: "1px solid var(--border-primary)",
              backgroundColor: "var(--bg-primary)",
            }}
          >
            {["Features", "How It Works", "Pricing"].map((label, idx) => (
              <a
                key={label}
                href={["#features", "#how-it-works", "#pricing"][idx]}
                className="py-2 text-base"
                style={navLinkStyle}
                onClick={() => setMobileMenuOpen(false)}
              >
                {label}
              </a>
            ))}
            <Link href="/login" className="py-2 text-base" style={navLinkStyle}>
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg px-5 py-3 text-center text-sm font-medium text-white"
              style={{ backgroundColor: "var(--accent-primary)" }}
            >
              Get Started Free
            </Link>
          </div>
        )}
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="px-6 pb-24 pt-20 text-center md:pt-28">
          <div className="mx-auto max-w-[800px]">
            <p
              className="mx-auto mb-6 inline-block rounded-full border px-4 py-1.5 text-sm"
              style={{
                borderColor: "var(--border-primary)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-secondary)",
              }}
            >
              Free to start — no credit card required
            </p>

            <h1
              className="text-5xl font-bold leading-[1.1] tracking-[-0.02em] md:text-[60px]"
              style={{ color: "var(--text-primary)" }}
            >
              Professional invoices that get paid.
            </h1>

            <p
              className="mx-auto mt-6 max-w-[600px] text-lg leading-[1.6] md:text-xl"
              style={{ color: "var(--text-secondary)" }}
            >
              Invoicer is a clean, focused workspace for freelancers and small business owners.
              Create branded invoices, manage clients, and track every dollar you&apos;re owed —
              in one place.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="rounded-lg px-6 py-3 text-base font-medium text-white shadow-[0_4px_20px_-5px_rgba(99,102,241,0.5)] transition-all hover:-translate-y-0.5 hover:bg-[var(--accent-hover)]"
                style={{ backgroundColor: "var(--accent-primary)" }}
              >
                Get Started Free
              </Link>
              <a
                href="#how-it-works"
                className="rounded-lg border px-6 py-3 text-base font-medium transition-colors hover:bg-[var(--bg-elevated)]"
                style={{
                  borderColor: "var(--border-primary)",
                  color: "var(--text-primary)",
                }}
              >
                See how it works
              </a>
            </div>

            <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
              No credit card required. Free forever on the core plan.
            </p>

            {/* Hero invoice card */}
            <div className="mt-16 w-full [perspective:2000px]">
              <div
                className="hero-card-enter rounded-2xl border p-6 text-left shadow-[0_50px_100px_-30px_rgba(0,0,0,0.5)]"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-primary)",
                }}
              >
                <div
                  className="hero-row-enter flex items-start justify-between border-b pb-4"
                  style={{
                    borderColor: "var(--border-primary)",
                    animationDelay: "160ms",
                  }}
                >
                  <div>
                    <p className="text-lg font-medium">
                      {heroInvoice?.invoiceNumber ?? "INV-0001"}
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Due on{" "}
                      {formatDate(
                        heroInvoice?.dueDate ?? new Date().toISOString().slice(0, 10),
                      )}
                    </p>
                  </div>
                  <StatusPill status={heroInvoice?.status ?? "draft"} />
                </div>

                <div
                  className="hero-row-enter mt-4 grid grid-cols-[3fr_1fr_1fr_1fr] gap-4 border-b pb-2 text-xs font-medium"
                  style={{
                    color: "var(--text-secondary)",
                    borderColor: "var(--border-primary)",
                    animationDelay: "300ms",
                  }}
                >
                  <div>DESCRIPTION</div>
                  <div className="text-right">QTY</div>
                  <div className="text-right">RATE</div>
                  <div className="text-right">AMOUNT</div>
                </div>

                {displayItems.map((item, idx) => (
                  <div
                    key={item.description}
                    className="hero-row-enter mt-2 grid grid-cols-[3fr_1fr_1fr_1fr] gap-4 text-sm"
                    style={{ animationDelay: `${400 + idx * 80}ms` }}
                  >
                    <span style={{ color: "var(--text-primary)" }}>{item.description}</span>
                    <span className="text-right" style={{ color: "var(--text-secondary)" }}>
                      {item.quantity}
                    </span>
                    <span className="text-right" style={{ color: "var(--text-secondary)" }}>
                      {formatMoney(item.unitPrice, fallbackCurrency)}
                    </span>
                    <span className="text-right" style={{ color: "var(--text-primary)" }}>
                      {formatMoney(item.unitPrice * item.quantity, fallbackCurrency)}
                    </span>
                  </div>
                ))}

                <div
                  className="hero-row-enter mt-6 border-t pt-4"
                  style={{
                    borderColor: "var(--border-primary)",
                    animationDelay: "720ms",
                  }}
                >
                  <div
                    className="ml-auto flex w-full max-w-[260px] justify-between py-1 text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <span>Subtotal</span>
                    <span>{formatMoney(subtotal, fallbackCurrency)}</span>
                  </div>
                  {heroTaxRate > 0 && (
                    <div
                      className="ml-auto flex w-full max-w-[260px] justify-between py-1 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <span>Tax ({heroTaxRate}%)</span>
                      <span>{formatMoney(taxAmount, fallbackCurrency)}</span>
                    </div>
                  )}
                  <div
                    className="ml-auto mt-2 flex w-full max-w-[260px] justify-between border-t pt-2 text-base font-semibold"
                    style={{
                      borderColor: "var(--border-primary)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <span>Total</span>
                    <span>{formatMoney(total, fallbackCurrency)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="reveal px-6 py-24">
          <div className="mx-auto w-full max-w-[1280px]">
            <div className="mb-16 text-center">
              <h2
                className="text-4xl font-semibold tracking-[-0.01em] md:text-5xl"
                style={{ color: "var(--text-primary)" }}
              >
                Everything you need, nothing you don&apos;t.
              </h2>
              <p
                className="mt-4 text-lg"
                style={{ color: "var(--text-secondary)" }}
              >
                Designed from the ground up for a fast, focused, and frustration-free invoicing
                experience.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  title: "Effortless invoicing",
                  body: "Build professional invoices in a clean, intuitive editor. Add line items, apply taxes and discounts, and adjust payment terms. Your invoice is ready in minutes.",
                },
                {
                  title: "Client management",
                  body: "Keep every client organized in one place. See total invoiced, total paid, and outstanding balance at a glance. Your full history with each client is always one click away.",
                },
                {
                  title: "Payment tracking",
                  body: "Record full or partial payments as they arrive. Statuses move from Sent to Partial to Paid automatically. Every record stays accurate with no extra work.",
                },
                {
                  title: "Catalog items",
                  body: "Save your services, rates, and products. Select from your catalog while building an invoice — description, price, and tax settings fill in automatically. Stop retyping the same line items.",
                },
                {
                  title: "At-a-glance dashboard",
                  body: "Total outstanding. Total overdue. Paid this month. Recent invoices. Every overdue invoice sorted by age. One screen. No mental math.",
                },
                {
                  title: "Professional PDF, every time",
                  body: "Generate a clean, branded PDF from any invoice. Your logo, itemized breakdown, payment terms, and notes — all formatted and ready to send. Paid invoices stamp automatically.",
                },
              ].map((f) => (
                <article
                  key={f.title}
                  className="rounded-2xl border p-8"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-primary)",
                  }}
                >
                  <h3
                    className="text-xl font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {f.title}
                  </h3>
                  <p
                    className="mt-3 text-base leading-[1.6]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {f.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Dashboard showcase ── */}
        <section
          className="reveal border-y px-6 py-24"
          style={{
            borderColor: "var(--border-primary)",
            backgroundColor: "var(--bg-surface)",
          }}
        >
          <div className="mx-auto grid w-full max-w-[1280px] gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <h2
                className="text-4xl font-semibold tracking-[-0.01em] md:text-5xl"
                style={{ color: "var(--text-primary)" }}
              >
                A beautifully crafted dashboard.
              </h2>
              <p
                className="mt-6 text-lg leading-[1.6]"
                style={{ color: "var(--text-secondary)" }}
              >
                Get a clear view of your business finances. See what&apos;s been paid, what&apos;s
                outstanding, and what&apos;s overdue — all in one concise screen. No more guessing
                about your cash flow.
              </p>
            </div>
            <div
              className="rounded-2xl border p-6"
              style={{
                backgroundColor: "var(--bg-primary)",
                borderColor: "var(--border-primary)",
              }}
            >
              {isGuest ? (
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  <Link
                    href="/login"
                    style={{ color: "var(--accent-primary)" }}
                    className="underline"
                  >
                    Sign in
                  </Link>{" "}
                  to see your live workspace data.
                </p>
              ) : dashboard.loading ? (
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Loading workspace data...
                </p>
              ) : dashboard.data ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      {
                        label: "Outstanding",
                        value: formatMoney(
                          dashboard.data.totalOutstanding,
                          dashboard.data.currency,
                        ),
                        color: "var(--text-primary)",
                      },
                      {
                        label: "Overdue",
                        value: formatMoney(
                          dashboard.data.totalOverdue,
                          dashboard.data.currency,
                        ),
                        color: "var(--danger-fg)",
                      },
                      {
                        label: "Paid This Month",
                        value: formatMoney(
                          dashboard.data.paidThisMonth,
                          dashboard.data.currency,
                        ),
                        color: "var(--success-fg)",
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="rounded-xl border p-3"
                        style={{
                          backgroundColor: "var(--bg-surface)",
                          borderColor: "var(--border-primary)",
                        }}
                      >
                        <p
                          className="text-xs"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {s.label}
                        </p>
                        <p
                          className="mt-1 text-base font-semibold"
                          style={{ color: s.color }}
                        >
                          {s.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  {dashboard.data.recentInvoices.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {dashboard.data.recentInvoices.slice(0, 3).map((inv) => (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between rounded-lg border px-3 py-2"
                          style={{
                            borderColor: "var(--border-primary)",
                            backgroundColor: "var(--bg-surface)",
                          }}
                        >
                          <div>
                            <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                            <p
                              className="text-xs"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {inv.clientName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {formatMoney(inv.total, inv.currency)}
                            </p>
                            <StatusPill status={inv.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="reveal px-6 py-24">
          <div className="mx-auto w-full max-w-[1280px]">
            <h2
              className="mb-16 text-center text-4xl font-semibold tracking-[-0.01em] md:text-5xl"
              style={{ color: "var(--text-primary)" }}
            >
              From zero to sent in five minutes.
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  num: "1",
                  label: "Set up your profile",
                  body: "Enter your business name and upload your logo. Set your default currency, tax rate, and payment terms. Done once. Applied to every invoice you create.",
                },
                {
                  num: "2",
                  label: "Build your invoice",
                  body: "Select a client or create one on the spot. Add line items from your catalog or type them in. Totals calculate in real time. No formulas required.",
                },
                {
                  num: "3",
                  label: "Send and track",
                  body: "Download the PDF and deliver it directly to your client. Record payments as they arrive. Overdue invoices surface automatically. Nothing slips through.",
                },
              ].map((s) => (
                <article
                  key={s.num}
                  className="rounded-2xl border p-8 text-center"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-primary)",
                  }}
                >
                  <div
                    className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full border text-lg font-semibold"
                    style={{
                      borderColor: "var(--border-primary)",
                      backgroundColor: "var(--bg-elevated)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {s.num}
                  </div>
                  <h3
                    className="text-xl font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {s.label}
                  </h3>
                  <p
                    className="mt-3 text-base leading-[1.6]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {s.body}
                  </p>
                </article>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                href="/register"
                className="rounded-lg px-6 py-3 text-base font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
                style={{ backgroundColor: "var(--accent-primary)" }}
              >
                Start your free account
              </Link>
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="reveal px-6 py-24">
          <div className="mx-auto w-full max-w-[1280px] text-center">
            <h2
              className="text-4xl font-semibold md:text-5xl"
              style={{ color: "var(--text-primary)" }}
            >
              Start free. Stay free.
            </h2>
            <p className="mt-4 text-lg" style={{ color: "var(--text-secondary)" }}>
              No client limits. No invoice limits. No tricks.
            </p>
            <div
              className="mx-auto mt-12 max-w-md rounded-2xl border p-10 text-left"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-primary)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--text-muted)" }}
              >
                Free
              </p>
              <p
                className="mt-2 text-5xl font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                $0{" "}
                <span
                  className="text-lg font-normal"
                  style={{ color: "var(--text-secondary)" }}
                >
                  / month
                </span>
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Unlimited invoices",
                  "Unlimited clients",
                  "Branded PDF generation",
                  "Dashboard with payment tracking",
                  "Catalog items",
                  "20 supported currencies",
                ].map((feat) => (
                  <li
                    key={feat}
                    className="flex items-center gap-3 text-base"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <Check
                      size={18}
                      strokeWidth={1.5}
                      style={{ color: "var(--accent-primary)", flexShrink: 0 }}
                    />
                    {feat}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-8 block w-full rounded-lg py-3 text-center text-base font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
                style={{ backgroundColor: "var(--accent-primary)" }}
              >
                Create Your Free Account
              </Link>
              <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                Team features and advanced reporting are on the roadmap. Early users get priority
                access.
              </p>
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="reveal px-6 pb-24">
          <div
            className="mx-auto w-full max-w-[1280px] rounded-2xl border p-10 text-center md:p-16"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-primary)",
            }}
          >
            <h2
              className="text-4xl font-semibold tracking-[-0.01em] md:text-5xl"
              style={{ color: "var(--text-primary)" }}
            >
              Your clients judge your invoice before they pay it.
            </h2>
            <p
              className="mx-auto mt-4 max-w-xl text-lg"
              style={{ color: "var(--text-secondary)" }}
            >
              Make it count. Set up Invoicer in two minutes and send your first professional
              invoice today.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-block rounded-lg px-8 py-3 text-base font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-[var(--accent-hover)]"
              style={{ backgroundColor: "var(--accent-primary)" }}
            >
              Get Started Free
            </Link>
            <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
              No credit card required. Free forever on the core plan.
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t px-6 py-12" style={{ borderColor: "var(--border-primary)" }}>
        <div className="mx-auto grid w-full max-w-[1280px] gap-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div
              className="flex items-center gap-2 text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              <Zap size={18} strokeWidth={1.5} style={{ color: "var(--accent-primary)" }} />
              Invoicer
            </div>
            <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
              Professional invoicing for the way you work.
            </p>
          </div>
          {[
            {
              title: "Product",
              links: [
                { label: "Features", href: "#features" },
                { label: "Pricing", href: "#pricing" },
                { label: "Sign In", href: "/login" },
                { label: "Create Account", href: "/register" },
              ],
            },
            {
              title: "Company",
              links: [
                { label: "About", href: "#" },
                { label: "Contact", href: "#" },
              ],
            },
            {
              title: "Legal",
              links: [
                { label: "Privacy Policy", href: "#" },
                { label: "Terms of Service", href: "#" },
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <p
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {col.title}
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="transition-colors hover:text-[var(--text-primary)]"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p
          className="mx-auto mt-10 w-full max-w-[1280px] text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          © 2026 Invoicer. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
