"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { PaginatedEnvelope, requestJson, toMessage } from "@/lib/client-http";

type Client = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  currency: string;
};

export default function ClientsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Client[]>([]);

  useEffect(() => {
    requestJson<PaginatedEnvelope<Client>>("/api/clients?page=1&limit=25")
      .then((res) => setItems(res.data))
      .catch((err) => setError(toMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Clients" description="Manage client records and billing defaults.">
      {loading && <p className="text-sm text-[var(--color-text-secondary)]">Loading clients...</p>}
      {!loading && error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
      {!loading && !error && items.length === 0 && <p className="text-sm text-[var(--color-text-secondary)]">Add your first client.</p>}
      {!loading && !error && items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Currency</th>
              </tr>
            </thead>
            <tbody>
              {items.map((client) => (
                <tr key={client.id} className="border-b border-[var(--color-border)] last:border-b-0">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/clients/${client.id}`} className="hover:text-[var(--color-accent-hover)]">
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{client.company || "—"}</td>
                  <td className="px-4 py-3">{client.email || "—"}</td>
                  <td className="px-4 py-3">{client.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
