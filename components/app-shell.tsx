"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Users, Settings, LogOut, Book, Menu, Plus, ReceiptText } from "lucide-react";
import { ReactNode, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/billing", label: "Billing", icon: ReceiptText },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/settings/catalog", label: "Catalog", icon: Book },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeHref = useMemo(() => {
    const found = NAV_ITEMS.find((item) => pathname.startsWith(item.href));
    return found?.href ?? "/dashboard";
  }, [pathname]);

  async function handleLogout() {
    try {
      await apiRequest<{ success: true }>("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#F5F5F5] lg:flex">
      {mobileOpen ? <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} /> : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[240px] border-r border-[#2E2E2E] bg-[#1A1A1A] p-6 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:sticky lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link href="/dashboard" className="mb-8 flex items-center gap-2 text-xl font-semibold">
          <Plus size={18} className="text-[#6366F1]" />
          Invoicer
        </Link>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-[#242424] text-[#F5F5F5]" : "text-[#A0A0A0] hover:bg-[#2E2E2E] hover:text-[#F5F5F5]"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="mt-8 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#A0A0A0] hover:bg-[#2E2E2E] hover:text-[#F5F5F5]"
          onClick={handleLogout}
        >
          <LogOut size={18} strokeWidth={1.5} />
          Sign Out
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-[#2E2E2E] bg-[#1A1A1A]/95 backdrop-blur">
          <div className="mx-auto flex h-[72px] w-full max-w-[1280px] items-center justify-between px-6 md:px-12">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#2E2E2E] text-[#A0A0A0] lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={18} strokeWidth={1.5} />
              </button>
              <h1 className="text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
            </div>
            {action}
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1280px] px-6 py-8 md:px-12">{children}</main>
      </div>
    </div>
  );
}
