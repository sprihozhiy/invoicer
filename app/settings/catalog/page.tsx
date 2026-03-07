"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ApiClientError, ApiEnvelope, formatMoney, requestJson, toMessage } from "@/lib/client-http";

type CatalogItem = {
  id: string;
  name: string;
  description: string | null;
  unitPrice: number;
  unit: string | null;
  taxable: boolean;
};

type EditorState = {
  mode: "add" | "edit";
  id: string | null;
  name: string;
  description: string;
  unitPrice: string;
  unit: string;
  taxable: boolean;
};

function emptyEditor(): EditorState {
  return {
    mode: "add",
    id: null,
    name: "",
    description: "",
    unitPrice: "",
    unit: "",
    taxable: false,
  };
}

export default function CatalogPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);

  useEffect(() => {
    requestJson<ApiEnvelope<CatalogItem[]>>("/api/catalog")
      .then((res) => setItems(res.data))
      .catch((err) => setError(toMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const limitWarning = useMemo(() => {
    if (items.length >= 500) {
      return "You've reached the 500 item limit. Remove an item to add a new one.";
    }
    if (items.length >= 450) {
      return `You have ${items.length} of 500 catalog items.`;
    }
    return null;
  }, [items.length]);

  const openAdd = () => {
    setToast(null);
    setEditor(emptyEditor());
  };

  const openEdit = (item: CatalogItem) => {
    setToast(null);
    setEditor({
      mode: "edit",
      id: item.id,
      name: item.name,
      description: item.description ?? "",
      unitPrice: (item.unitPrice / 100).toFixed(2),
      unit: item.unit ?? "",
      taxable: item.taxable,
    });
  };

  const closeEditor = () => setEditor(null);

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor) return;

    setSaving(true);
    setError(null);
    setToast(null);

    const parsed = Number(editor.unitPrice);
    if (!editor.name.trim()) {
      setError("Item name is required.");
      setSaving(false);
      return;
    }
    if (!Number.isFinite(parsed)) {
      setError("Unit price is required.");
      setSaving(false);
      return;
    }

    const body = {
      name: editor.name.trim(),
      description: editor.description.trim() || null,
      unitPrice: Math.round(parsed * 100),
      unit: editor.unit.trim() || null,
      taxable: editor.taxable,
    };

    try {
      if (editor.mode === "add") {
        const res = await requestJson<ApiEnvelope<CatalogItem>>("/api/catalog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        setItems((current) => [...current, res.data].sort((a, b) => a.name.localeCompare(b.name)));
        setToast("Item added.");
      } else if (editor.id) {
        const res = await requestJson<ApiEnvelope<CatalogItem>>(`/api/catalog/${editor.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        setItems((current) => current.map((item) => (item.id === res.data.id ? res.data : item)).sort((a, b) => a.name.localeCompare(b.name)));
        setToast("Item updated.");
      }
      closeEditor();
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "CATALOG_LIMIT_EXCEEDED") {
        setError("You've reached the 500 item limit. Remove an item to add a new one.");
      } else {
        setError(toMessage(err));
      }
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    setToast(null);
    try {
      await requestJson<{ success: true }>(`/api/catalog/${id}`, { method: "DELETE" });
      setItems((current) => current.filter((item) => item.id !== id));
      setToast("Item deleted.");
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppShell
      title="Catalog"
      description="Saved items used to auto-fill line items when building invoices."
      actions={
        <button
          type="button"
          disabled={items.length >= 500}
          onClick={openAdd}
          className="rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add Item
        </button>
      }
    >
      <div className="space-y-4">
        {loading && <p className="text-sm text-[var(--color-text-secondary)]">Loading catalog...</p>}
        {!loading && error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
        {limitWarning && <p className="text-sm text-[var(--color-warning)]">{limitWarning}</p>}
        {toast && <p className="text-sm text-[var(--color-success)]">{toast}</p>}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
            <p className="text-lg font-medium">Your catalog is empty.</p>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Save your frequently used services and products here. Select them from the dropdown while building an invoice.
            </p>
            <button
              type="button"
              onClick={openAdd}
              className="mt-5 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)]"
            >
              Add Item
            </button>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Unit Price</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Taxable</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{item.description || "—"}</td>
                    <td className="px-4 py-3">{formatMoney(item.unitPrice, "USD")}</td>
                    <td className="px-4 py-3">{item.unit || "—"}</td>
                    <td className="px-4 py-3">{item.taxable ? "Yes" : "No"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-primary)]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={() => onDelete(item.id)}
                          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-error)] hover:bg-[var(--color-elevated)] disabled:opacity-60"
                        >
                          {deletingId === item.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={onSave} className="w-full max-w-xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-elevated)] p-6">
            <h3 className="text-xl font-medium">{editor.mode === "add" ? "Add Catalog Item" : "Edit Catalog Item"}</h3>
            <div className="mt-4 grid gap-4">
              <label className="text-sm text-[var(--color-text-secondary)]">
                Item Name
                <input
                  required
                  value={editor.name}
                  onChange={(event) => setEditor({ ...editor, name: event.target.value })}
                  className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text-primary)]"
                />
              </label>
              <label className="text-sm text-[var(--color-text-secondary)]">
                Description
                <textarea
                  value={editor.description}
                  onChange={(event) => setEditor({ ...editor, description: event.target.value })}
                  className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text-primary)]"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-[var(--color-text-secondary)]">
                  Unit Price
                  <input
                    required
                    type="number"
                    min={0}
                    step={0.01}
                    value={editor.unitPrice}
                    onChange={(event) => setEditor({ ...editor, unitPrice: event.target.value })}
                    className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text-primary)]"
                  />
                </label>
                <label className="text-sm text-[var(--color-text-secondary)]">
                  Unit Label
                  <input
                    value={editor.unit}
                    onChange={(event) => setEditor({ ...editor, unit: event.target.value })}
                    className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text-primary)]"
                  />
                </label>
              </div>
              <label className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={editor.taxable}
                  onChange={(event) => setEditor({ ...editor, taxable: event.target.checked })}
                  className="size-4 rounded border-[var(--color-border)] bg-[var(--color-surface)]"
                />
                Taxable
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                type="submit"
                className="rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
              >
                {saving ? "Saving..." : editor.mode === "add" ? "Save Item" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
