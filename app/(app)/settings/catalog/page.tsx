"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  BookOpen,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { requestJson, ApiClientError, toErrorMessage } from "../../../_lib/api";
import { centsToDisplay } from "../../../_lib/format";
import type { CatalogItem } from "../../../_lib/types";
import { Button, IconButton } from "../../../_components/Button";
import {
  Input,
  Label,
  FormGroup,
  FieldError,
  Textarea,
} from "../../../_components/FormField";
import { Modal } from "../../../_components/Modal";
import { useToast } from "../../../_components/Toast";

const ITEM_LIMIT = 500;
const WARN_THRESHOLD = 490;

// ---------------------------------------------------------------------------
// Item form state shared between Add and Edit modals
// ---------------------------------------------------------------------------
interface ItemFormState {
  name: string;
  description: string;
  unitPrice: string;
  unit: string;
  taxable: boolean;
}

const emptyForm = (): ItemFormState => ({
  name: "",
  description: "",
  unitPrice: "",
  unit: "",
  taxable: false,
});

function itemToForm(item: CatalogItem): ItemFormState {
  return {
    name: item.name,
    description: item.description ?? "",
    unitPrice: centsToDisplay(item.unitPrice),
    unit: item.unit ?? "",
    taxable: item.taxable,
  };
}

function parsePriceToCents(value: string): number {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) return 0;
  return Math.round(num * 100);
}

// ---------------------------------------------------------------------------
// Checkbox
// ---------------------------------------------------------------------------
function Checkbox({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-3 select-none"
    >
      <div
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors"
        style={{
          backgroundColor: checked
            ? "var(--accent-primary)"
            : "var(--bg-elevated)",
          borderColor: checked ? "var(--accent-primary)" : "var(--border-primary)",
        }}
      >
        {checked && (
          <svg
            viewBox="0 0 10 8"
            width="10"
            height="8"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="1 4 3.5 6.5 9 1" />
          </svg>
        )}
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
      </div>
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Item form fields (shared between Add and Edit)
// ---------------------------------------------------------------------------
interface ItemFormFieldsProps {
  form: ItemFormState;
  onChange: (patch: Partial<ItemFormState>) => void;
  errors: Partial<Record<keyof ItemFormState, string>>;
  submitting: boolean;
  formError: string | null;
  submitLabel: string;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

function ItemFormFields({
  form,
  onChange,
  errors,
  submitting,
  formError,
  submitLabel,
  onSubmit,
  onClose,
}: ItemFormFieldsProps) {
  return (
    <form onSubmit={onSubmit} noValidate>
      {formError && (
        <div
          className="mb-5 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm"
          style={{
            backgroundColor: "var(--danger-bg)",
            borderColor: "var(--danger-fg)",
            color: "var(--danger-fg)",
          }}
        >
          <AlertCircle size={15} strokeWidth={1.5} className="flex-shrink-0" />
          {formError}
        </div>
      )}

      <FormGroup>
        <Label htmlFor="catalog-name" required>
          Name
        </Label>
        <Input
          id="catalog-name"
          placeholder="e.g. Web Design"
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          error={errors.name}
          disabled={submitting}
          autoFocus
        />
        <FieldError message={errors.name} />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="catalog-description">Description</Label>
        <Textarea
          id="catalog-description"
          rows={2}
          placeholder="Optional description"
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
          disabled={submitting}
        />
      </FormGroup>

      <div className="mb-5 grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="catalog-unit-price" required>
            Unit Price
          </Label>
          <Input
            id="catalog-unit-price"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.unitPrice}
            onChange={(e) => onChange({ unitPrice: e.target.value })}
            error={errors.unitPrice}
            disabled={submitting}
          />
          <FieldError message={errors.unitPrice} />
        </div>

        <div>
          <Label htmlFor="catalog-unit">Unit</Label>
          <Input
            id="catalog-unit"
            placeholder="e.g. hour, day"
            maxLength={20}
            value={form.unit}
            onChange={(e) => onChange({ unit: e.target.value })}
            disabled={submitting}
          />
        </div>
      </div>

      <FormGroup>
        <Checkbox
          id="catalog-taxable"
          checked={form.taxable}
          onChange={(v) => onChange({ taxable: v })}
          label="Taxable"
        />
      </FormGroup>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Skeleton rows
// ---------------------------------------------------------------------------
function SkeletonRows() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <tr key={i}>
          {[140, 200, 80, 60, 60, 80].map((w, j) => (
            <td key={j} className="px-6 py-4">
              <div
                className="h-4 animate-pulse rounded"
                style={{
                  width: `${w}px`,
                  backgroundColor: "var(--bg-elevated)",
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function CatalogPage() {
  const { toast } = useToast();

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<ItemFormState>(emptyForm());
  const [addErrors, setAddErrors] = useState<
    Partial<Record<keyof ItemFormState, string>>
  >({});
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Edit modal
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [editForm, setEditForm] = useState<ItemFormState>(emptyForm());
  const [editErrors, setEditErrors] = useState<
    Partial<Record<keyof ItemFormState, string>>
  >({});
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete confirm modal
  const [deleteItem, setDeleteItem] = useState<CatalogItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  const fetchItems = (q: string) => {
    setLoading(true);
    setLoadError(null);
    const url = q.trim()
      ? `/api/catalog?search=${encodeURIComponent(q.trim())}`
      : "/api/catalog";
    requestJson<{ data: CatalogItem[] }>(url)
      .then((res) => {
        setItems(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setLoadError(toErrorMessage(err));
        setLoading(false);
      });
  };

  // Initial load
  useEffect(() => {
    fetchItems("");
  }, []);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchItems(value);
    }, 300);
  };

  // ---------------------------------------------------------------------------
  // Validate form
  // ---------------------------------------------------------------------------
  function validateForm(
    form: ItemFormState,
  ): Partial<Record<keyof ItemFormState, string>> {
    const errs: Partial<Record<keyof ItemFormState, string>> = {};
    if (!form.name.trim()) errs.name = "Name is required.";
    if (form.unitPrice === "" || isNaN(parseFloat(form.unitPrice))) {
      errs.unitPrice = "Unit price is required.";
    } else if (parseFloat(form.unitPrice) < 0) {
      errs.unitPrice = "Unit price must be 0 or greater.";
    }
    return errs;
  }

  // ---------------------------------------------------------------------------
  // Add
  // ---------------------------------------------------------------------------
  const openAdd = () => {
    setAddForm(emptyForm());
    setAddErrors({});
    setAddFormError(null);
    setAddOpen(true);
  };

  const closeAdd = () => {
    if (addSubmitting) return;
    setAddOpen(false);
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateForm(addForm);
    if (Object.keys(errs).length > 0) {
      setAddErrors(errs);
      return;
    }
    setAddErrors({});
    setAddFormError(null);
    setAddSubmitting(true);

    try {
      const res = await requestJson<{ data: CatalogItem }>("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name.trim(),
          description: addForm.description.trim() || null,
          unitPrice: parsePriceToCents(addForm.unitPrice),
          unit: addForm.unit.trim() || null,
          taxable: addForm.taxable,
        }),
      });
      setItems((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      toast("Item added.");
      setAddOpen(false);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "CATALOG_LIMIT_EXCEEDED") {
        setAddFormError("You've reached the 500 item limit.");
      } else {
        setAddFormError(toErrorMessage(err));
      }
    } finally {
      setAddSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Edit
  // ---------------------------------------------------------------------------
  const openEdit = (item: CatalogItem) => {
    setEditItem(item);
    setEditForm(itemToForm(item));
    setEditErrors({});
    setEditFormError(null);
  };

  const closeEdit = () => {
    if (editSubmitting) return;
    setEditItem(null);
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    const errs = validateForm(editForm);
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }
    setEditErrors({});
    setEditFormError(null);
    setEditSubmitting(true);

    try {
      const res = await requestJson<{ data: CatalogItem }>(
        `/api/catalog/${editItem.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editForm.name.trim(),
            description: editForm.description.trim() || null,
            unitPrice: parsePriceToCents(editForm.unitPrice),
            unit: editForm.unit.trim() || null,
            taxable: editForm.taxable,
          }),
        },
      );
      setItems((prev) =>
        prev
          .map((it) => (it.id === editItem.id ? res.data : it))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      toast("Item updated.");
      setEditItem(null);
    } catch (err) {
      setEditFormError(toErrorMessage(err));
    } finally {
      setEditSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  const openDelete = (item: CatalogItem) => {
    setDeleteItem(item);
  };

  const closeDelete = () => {
    if (deleteSubmitting) return;
    setDeleteItem(null);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleteSubmitting(true);
    try {
      await requestJson<{ success: true }>(`/api/catalog/${deleteItem.id}`, {
        method: "DELETE",
      });
      setItems((prev) => prev.filter((it) => it.id !== deleteItem.id));
      toast("Item deleted.");
      setDeleteItem(null);
    } catch (err) {
      toast(toErrorMessage(err), "error");
      setDeleteItem(null);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  const count = items.length;
  const atLimit = count >= ITEM_LIMIT;
  const nearLimit = count >= WARN_THRESHOLD && !atLimit;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div>
      {/* Page header */}
      <div
        className="px-8 py-6"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-primary)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-3xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Catalog
            </h1>
            {!loading && !loadError && (
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                You have {count} of {ITEM_LIMIT} catalog items.
              </p>
            )}
          </div>
          <Button
            onClick={openAdd}
            disabled={atLimit}
            className="flex-shrink-0 mt-1"
          >
            <Plus size={16} strokeWidth={1.5} />
            Add Item
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-[960px] px-8 py-8">
        {/* Limit warnings */}
        {nearLimit && (
          <div
            className="mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
            style={{
              backgroundColor: "var(--danger-bg)",
              borderColor: "var(--danger-fg)",
              color: "var(--danger-fg)",
            }}
          >
            <AlertCircle size={15} strokeWidth={1.5} className="flex-shrink-0" />
            You&apos;re approaching the {ITEM_LIMIT} item limit.
          </div>
        )}
        {atLimit && (
          <div
            className="mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
            style={{
              backgroundColor: "var(--danger-bg)",
              borderColor: "var(--danger-fg)",
              color: "var(--danger-fg)",
            }}
          >
            <AlertCircle size={15} strokeWidth={1.5} className="flex-shrink-0" />
            You&apos;ve reached the {ITEM_LIMIT} item limit. Remove an item to add a new one.
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search
            size={15}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            type="search"
            placeholder="Search catalog..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="block w-full rounded-lg border py-3 pl-10 pr-4 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            style={{
              backgroundColor: "var(--bg-elevated)",
              borderColor: "var(--border-primary)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Content area */}
        {loadError ? (
          <div
            className="flex flex-col items-center gap-3 rounded-2xl border px-6 py-16 text-center"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-primary)",
            }}
          >
            <AlertCircle
              size={36}
              strokeWidth={1.25}
              style={{ color: "var(--danger-fg)" }}
            />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {loadError}
            </p>
          </div>
        ) : (
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-primary)",
            }}
          >
            {!loading && items.length === 0 ? (
              // Empty state
              search.trim() ? (
                <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    No items match your search.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
                  <BookOpen
                    size={40}
                    strokeWidth={1.25}
                    style={{ color: "var(--text-muted)" }}
                  />
                  <div>
                    <p
                      className="text-base font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Your catalog is empty.
                    </p>
                    <p
                      className="mt-1 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Save your frequently used services and products here.
                    </p>
                  </div>
                  <Button onClick={openAdd} disabled={atLimit}>
                    <Plus size={15} strokeWidth={1.5} />
                    Add your first item
                  </Button>
                </div>
              )
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid var(--border-primary)",
                      }}
                    >
                      {["Name", "Description", "Unit Price", "Unit", "Taxable", ""].map(
                        (col) => (
                          <th
                            key={col}
                            className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${col === "" ? "w-24" : ""}`}
                            style={{ color: "var(--text-muted)" }}
                          >
                            {col}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <SkeletonRows />
                    ) : (
                      items.map((item, idx) => (
                        <tr
                          key={item.id}
                          style={{
                            borderTop:
                              idx > 0
                                ? "1px solid var(--border-primary)"
                                : undefined,
                          }}
                          className="transition-colors"
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "var(--bg-hover)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = "")
                          }
                        >
                          {/* Name */}
                          <td
                            className="px-6 py-4 font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {item.name}
                          </td>

                          {/* Description */}
                          <td
                            className="px-6 py-4 max-w-[240px]"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {item.description
                              ? item.description.length > 60
                                ? item.description.slice(0, 60) + "…"
                                : item.description
                              : (
                                <span style={{ color: "var(--text-muted)" }}>
                                  —
                                </span>
                              )}
                          </td>

                          {/* Unit Price */}
                          <td
                            className="px-6 py-4"
                            style={{ color: "var(--text-primary)" }}
                          >
                            ${centsToDisplay(item.unitPrice)}
                          </td>

                          {/* Unit */}
                          <td
                            className="px-6 py-4"
                            style={{
                              color: item.unit
                                ? "var(--text-secondary)"
                                : "var(--text-muted)",
                            }}
                          >
                            {item.unit ?? "—"}
                          </td>

                          {/* Taxable */}
                          <td className="px-6 py-4">
                            {item.taxable ? (
                              <span
                                className="text-xs font-medium"
                                style={{ color: "var(--success-fg)" }}
                              >
                                Yes
                              </span>
                            ) : (
                              <span
                                className="text-xs font-medium"
                                style={{ color: "var(--text-muted)" }}
                              >
                                No
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <IconButton
                                onClick={() => openEdit(item)}
                                title="Edit item"
                              >
                                <Edit2 size={15} strokeWidth={1.5} />
                              </IconButton>
                              <button
                                onClick={() => openDelete(item)}
                                title="Delete item"
                                className="inline-flex items-center justify-center rounded-lg p-2 transition-colors"
                                style={{ color: "var(--danger-fg)" }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                    "var(--danger-bg)")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.backgroundColor = "")
                                }
                              >
                                <Trash2 size={15} strokeWidth={1.5} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      <Modal open={addOpen} onClose={closeAdd} title="Add Item">
        <ItemFormFields
          form={addForm}
          onChange={(patch) => setAddForm((prev) => ({ ...prev, ...patch }))}
          errors={addErrors}
          submitting={addSubmitting}
          formError={addFormError}
          submitLabel="Add Item"
          onSubmit={handleAdd}
          onClose={closeAdd}
        />
      </Modal>

      {/* Edit Item Modal */}
      <Modal open={!!editItem} onClose={closeEdit} title="Edit Item">
        <ItemFormFields
          form={editForm}
          onChange={(patch) => setEditForm((prev) => ({ ...prev, ...patch }))}
          errors={editErrors}
          submitting={editSubmitting}
          formError={editFormError}
          submitLabel="Save Changes"
          onSubmit={handleEdit}
          onClose={closeEdit}
        />
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteItem} onClose={closeDelete} title="Delete Item">
        <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>
          Are you sure you want to delete{" "}
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
            {deleteItem?.name}
          </span>
          ? This cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={closeDelete}
            disabled={deleteSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={deleteSubmitting}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
