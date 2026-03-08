"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  LogOut,
  Zap,
  Menu,
  X,
  BookOpen,
} from "lucide-react";
import { requestJson } from "../_lib/api";
import { ToastProvider } from "../_components/Toast";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} strokeWidth={1.5} /> },
  { href: "/invoices", label: "Invoices", icon: <FileText size={18} strokeWidth={1.5} /> },
  { href: "/clients", label: "Clients", icon: <Users size={18} strokeWidth={1.5} /> },
];

const SETTINGS_ITEMS: NavItem[] = [
  { href: "/settings", label: "Settings", icon: <Settings size={18} strokeWidth={1.5} /> },
];

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all"
      style={{
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        backgroundColor: active ? "var(--bg-elevated)" : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "var(--bg-hover)";
          e.currentTarget.style.color = "var(--text-primary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "var(--text-secondary)";
        }
      }}
    >
      <span style={{ color: active ? "var(--accent-primary)" : "currentColor" }}>
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

function Sidebar({
  userName,
  onSignOut,
  mobile,
  onClose,
}: {
  userName: string;
  onSignOut: () => void;
  mobile?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/settings") return pathname.startsWith("/settings");
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside
      className="flex h-full flex-col p-6"
      style={{
        width: mobile ? "100%" : "var(--sidebar-width, 240px)",
        backgroundColor: "var(--bg-surface)",
        borderRight: mobile ? "none" : "1px solid var(--border-primary)",
      }}
    >
      {/* Logo */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xl font-semibold"
          style={{ color: "var(--text-primary)" }}
          onClick={onClose}
        >
          <Zap size={20} strokeWidth={1.5} style={{ color: "var(--accent-primary)" }} />
          Invoicer
        </Link>
        {mobile && onClose && (
          <button
            onClick={onClose}
            style={{ color: "var(--text-secondary)" }}
            aria-label="Close sidebar"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href)}
            onClick={onClose}
          />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="mt-4 space-y-1 border-t pt-4" style={{ borderColor: "var(--border-primary)" }}>
        {/* Catalog */}
        <NavLink
          item={{ href: "/settings/catalog", label: "Catalog", icon: <BookOpen size={18} strokeWidth={1.5} /> }}
          active={pathname === "/settings/catalog"}
          onClick={onClose}
        />
        {SETTINGS_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={pathname === "/settings"}
            onClick={onClose}
          />
        ))}
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--bg-hover)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <LogOut size={18} strokeWidth={1.5} />
          Sign Out
        </button>
        {userName && (
          <p
            className="mt-2 truncate px-3 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {userName}
          </p>
        )}
      </div>
    </aside>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    requestJson<{ data: { businessName: string; email: string } }>("/api/profile")
      .then((res) => {
        setUserName(res.data.email ?? res.data.businessName ?? "");
      })
      .catch(() => {});
  }, []);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const signOut = async () => {
    try {
      await requestJson<{ success: true }>("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    router.push("/login");
  };

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
        {/* Desktop sidebar */}
        <div
          className="hidden flex-shrink-0 md:block"
          style={{ width: "240px", borderRight: "1px solid var(--border-primary)" }}
        >
          <div className="h-full overflow-y-auto">
            <Sidebar userName={userName} onSignOut={signOut} />
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 md:hidden"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
              onClick={() => setMobileOpen(false)}
            />
            <div
              className="slide-in-left fixed left-0 top-0 z-50 h-full w-64 md:hidden"
              style={{ backgroundColor: "var(--bg-surface)", borderRight: "1px solid var(--border-primary)" }}
            >
              <Sidebar
                userName={userName}
                onSignOut={signOut}
                mobile
                onClose={() => setMobileOpen(false)}
              />
            </div>
          </>
        )}

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile header */}
          <header
            className="flex items-center justify-between px-4 py-4 md:hidden"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderBottom: "1px solid var(--border-primary)",
            }}
          >
            <button
              onClick={() => setMobileOpen(true)}
              style={{ color: "var(--text-primary)" }}
              aria-label="Open sidebar"
            >
              <Menu size={22} strokeWidth={1.5} />
            </button>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              <Zap size={18} strokeWidth={1.5} style={{ color: "var(--accent-primary)" }} />
              Invoicer
            </Link>
            <div className="w-8" />
          </header>

          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
