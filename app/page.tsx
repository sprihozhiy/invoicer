import Link from "next/link";
import { ArrowRight, BarChart3, BookOpen, FileText, FolderKanban, Receipt, Users } from "lucide-react";

const features = [
  {
    title: "Effortless invoicing",
    body: "Build professional invoices in a clean, intuitive editor. Add line items, apply taxes and discounts, and adjust payment terms. Your invoice is ready in minutes.",
    icon: FileText,
  },
  {
    title: "Client management",
    body: "Keep every client organized in one place. See total invoiced, total paid, and outstanding balance at a glance. Your full history with each client is always one click away.",
    icon: Users,
  },
  {
    title: "Payment tracking",
    body: "Record full or partial payments as they arrive. Statuses move from Sent to Partial to Paid automatically. Every record stays accurate with no extra work.",
    icon: Receipt,
  },
  {
    title: "Catalog items",
    body: "Save your services, rates, and products. Select from your catalog while building an invoice — description, price, and tax settings fill in automatically. Stop retyping the same line items.",
    icon: FolderKanban,
  },
  {
    title: "At-a-glance dashboard",
    body: "Total outstanding. Total overdue. Paid this month. Recent invoices. Every overdue invoice sorted by age. One screen. No mental math.",
    icon: BarChart3,
  },
  {
    title: "Professional PDF, every time",
    body: "Generate a clean, branded PDF from any invoice. Your logo, itemized breakdown, payment terms, and notes — all formatted and ready to send. Paid invoices stamp automatically.",
    icon: BookOpen,
  },
];

export default function MarketingPage() {
  return (
    <div className="bg-[#0F0F0F] text-[#F5F5F5]">
      <header className="sticky top-0 z-40 border-b border-[#2E2E2E] bg-[#0F0F0F]/90 backdrop-blur">
        <div className="mx-auto flex h-[72px] w-full max-w-[1280px] items-center justify-between px-6 md:px-12">
          <Link href="/" className="text-xl font-semibold">Invoicer</Link>
          <nav className="hidden items-center gap-8 text-sm text-[#A0A0A0] md:flex">
            <a href="#features" className="hover:text-[#F5F5F5]">Features</a>
            <a href="#how" className="hover:text-[#F5F5F5]">How It Works</a>
            <a href="#pricing" className="hover:text-[#F5F5F5]">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-[#A0A0A0] hover:text-[#F5F5F5]">Sign In</Link>
            <Link href="/register" className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium text-white hover:bg-[#818CF8]">
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1280px] px-6 pb-24 pt-24 text-center md:px-12 md:pt-32">
        <p className="mx-auto mb-4 inline-flex rounded-full border border-[#2E2E2E] bg-[#1A1A1A] px-3 py-1 text-xs text-[#A0A0A0]">
          Free to start — no credit card required
        </p>
        <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[1.1] tracking-[-0.02em] md:text-6xl">Professional invoices that get paid.</h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg text-[#A0A0A0]">
          Invoicer is a clean, focused workspace for freelancers and small business owners. Create branded invoices, manage clients, and track every dollar you&apos;re owed — in one place.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-5 py-3 font-medium text-white hover:bg-[#818CF8]">
            Get Started Free <ArrowRight size={18} strokeWidth={1.5} />
          </Link>
          <a href="#how" className="rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-5 py-3 font-medium text-[#F5F5F5] hover:bg-[#2E2E2E]">
            See how it works
          </a>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1280px] px-6 py-24 md:px-12">
        <h2 className="text-4xl font-semibold tracking-[-0.01em]">Everything you need, nothing you don&apos;t.</h2>
        <p className="mt-3 text-lg text-[#A0A0A0]">Designed from the ground up for a fast, focused, and frustration-free invoicing experience.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6">
                <Icon size={24} strokeWidth={1.5} className="text-[#6366F1]" />
                <h3 className="mt-4 text-2xl font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm text-[#A0A0A0]">{feature.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-[1280px] px-6 py-24 md:px-12">
        <h2 className="text-4xl font-semibold tracking-[-0.01em]">From zero to sent in five minutes.</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            ["Set up your profile", "Enter your business name and upload your logo. Set your default currency, tax rate, and payment terms. Done once. Applied to every invoice you create."],
            ["Build your invoice", "Select a client or create one on the spot. Add line items from your catalog or type them in. Totals calculate in real time. No formulas required."],
            ["Send and track", "Download the PDF and deliver it directly to your client. Record payments as they arrive. Overdue invoices surface automatically. Nothing slips through."],
          ].map(([label, body], index) => (
            <div key={label} className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6">
              <p className="text-xs uppercase tracking-[0.01em] text-[#A0A0A0]">Step {index + 1}</p>
              <h3 className="mt-2 text-2xl font-semibold">{label}</h3>
              <p className="mt-3 text-sm text-[#A0A0A0]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-[1280px] px-6 py-24 md:px-12">
        <h2 className="text-4xl font-semibold tracking-[-0.01em]">Start free. Stay free.</h2>
        <p className="mt-3 text-lg text-[#A0A0A0]">No client limits. No invoice limits. No tricks.</p>
        <div className="mt-10 max-w-[520px] rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-8">
          <p className="text-sm text-[#A0A0A0]">Free — $0 / month</p>
          <ul className="mt-6 space-y-2 text-sm text-[#F5F5F5]">
            <li>Unlimited invoices</li>
            <li>Unlimited clients</li>
            <li>Branded PDF generation</li>
            <li>Dashboard with payment tracking</li>
            <li>Catalog items</li>
            <li>20 supported currencies</li>
          </ul>
          <Link href="/register" className="mt-8 inline-flex rounded-lg bg-[#6366F1] px-5 py-3 text-sm font-medium text-white hover:bg-[#818CF8]">
            Create Your Free Account
          </Link>
          <p className="mt-4 text-xs text-[#6B6B6B]">Team features and advanced reporting are on the roadmap. Early users get priority access.</p>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-6 py-24 md:px-12">
        <div className="rounded-2xl border border-[#2E2E2E] bg-[#1A1A1A] p-10 text-center">
          <h2 className="text-4xl font-semibold tracking-[-0.01em]">Your clients judge your invoice before they pay it.</h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-[#A0A0A0]">Make it count. Set up Invoicer in two minutes and send your first professional invoice today.</p>
          <Link href="/register" className="mt-8 inline-flex rounded-lg bg-[#6366F1] px-5 py-3 text-sm font-medium text-white hover:bg-[#818CF8]">
            Get Started Free
          </Link>
          <p className="mt-3 text-xs text-[#6B6B6B]">No credit card required. Free forever on the core plan.</p>
        </div>
      </section>

      <footer className="border-t border-[#2E2E2E]">
        <div className="mx-auto grid max-w-[1280px] gap-8 px-6 py-12 text-sm md:grid-cols-4 md:px-12">
          <div>
            <p className="text-lg font-semibold">Invoicer</p>
            <p className="mt-2 text-[#A0A0A0]">Professional invoicing for the way you work.</p>
          </div>
          <div>
            <p className="font-medium">Product</p>
            <ul className="mt-3 space-y-2 text-[#A0A0A0]">
              <li>Features</li><li>Pricing</li><li>Sign In</li><li>Create Account</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">Company</p>
            <ul className="mt-3 space-y-2 text-[#A0A0A0]"><li>About</li><li>Contact</li></ul>
          </div>
          <div>
            <p className="font-medium">Legal</p>
            <ul className="mt-3 space-y-2 text-[#A0A0A0]"><li>Privacy Policy</li><li>Terms of Service</li></ul>
          </div>
        </div>
        <div className="border-t border-[#2E2E2E] px-6 py-4 text-center text-xs text-[#6B6B6B] md:px-12">© 2026 Invoicer. All rights reserved.</div>
      </footer>
    </div>
  );
}
