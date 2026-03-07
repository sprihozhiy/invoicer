"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";

import { requestJson } from "@/lib/client-http";

type NavLinkItem = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
};

const mainLinks: NavLinkItem[] = [
  { href: "/dashboard", label: "Dashboard", match: (pathname) => pathname === "/dashboard" },
  { href: "/invoices", label: "Invoices", match: (pathname) => pathname === "/invoices" },
  { href: "/clients", label: "Clients", match: (pathname) => pathname === "/clients" },
];

const secondaryLinks: NavLinkItem[] = [
  { href: "/billing", label: "Billing", match: (pathname) => pathname === "/billing" },
  {
    href: "/settings",
    label: "Settings",
    match: (pathname) => pathname === "/settings",
  },
  {
    href: "/settings/catalog",
    label: "Catalog",
    match: (pathname) => pathname === "/settings/catalog",
  },
];

function NavLink({ item, pathname, closeMobileMenu }: { item: NavLinkItem; pathname: string; closeMobileMenu: () => void }) {
  const active = item.match(pathname);
  return (
    <li>
      <Link
        href={item.href}
        onClick={closeMobileMenu}
        className={`block rounded-lg px-3 py-2 text-sm transition ${
          active
            ? "bg-[var(--color-elevated)] text-[var(--color-text-primary)]"
            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-primary)]"
        }`}
      >
        {item.label}
      </Link>
    </li>
  );
}

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const closeMobileMenu = () => setMobileOpen(false);

  const onLogout = async () => {
    setLogoutLoading(true);
    try {
      await requestJson<{ success: true }>("/api/auth/logout", { method: "POST" });
    } catch {
      // The session may already be invalid, continue to public home.
    } finally {
      setLogoutLoading(false);
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {mobileOpen && <button className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={closeMobileMenu} aria-label="Close menu" />}

      <aside
        className={`fixed top-0 z-40 h-full w-[240px] border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-transform md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link href="/dashboard" onClick={closeMobileMenu} className="mb-8 block text-xl font-semibold tracking-tight">
          Invoicer
        </Link>
        <nav className="space-y-2">
          <ul className="space-y-2">
            {mainLinks.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} closeMobileMenu={closeMobileMenu} />
            ))}
          </ul>
          <div className="border-t border-[var(--color-border)] pt-2">
            <ul className="space-y-2">
              {secondaryLinks.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} closeMobileMenu={closeMobileMenu} />
              ))}
            </ul>
          </div>
        </nav>
        <button
          type="button"
          onClick={onLogout}
          disabled={logoutLoading}
          className="mt-6 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-primary)] disabled:opacity-60"
        >
          {logoutLoading ? "Signing out..." : "Sign Out"}
        </button>
      </aside>

      <main className="md:pl-[240px]">
        <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[color:rgba(15,15,15,0.92)] px-4 py-4 backdrop-blur md:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                className="mt-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm text-[var(--color-text-secondary)] md:hidden"
                onClick={() => setMobileOpen((open) => !open)}
              >
                Menu
              </button>
              <div>
                <h1 className="text-2xl font-semibold">{title}</h1>
                {description && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>}
              </div>
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
