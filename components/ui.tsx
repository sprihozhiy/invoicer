"use client";

import { ReactNode } from "react";
import { InvoiceStatus, formatStatus } from "@/lib/client";

export function PageLoader({ label = "Loading..." }: { label?: string }) {
  return <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6 text-sm text-[#A0A0A0]">{label}</div>;
}

export function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-[#450A0A] bg-[#171717] p-6 text-sm text-[#EF4444]">
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          className="mt-3 rounded-lg border border-[#EF4444] px-3 py-2 text-xs font-medium text-[#EF4444] hover:bg-[#450A0A]"
          onClick={onRetry}
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[#2E2E2E] bg-[#1A1A1A] p-8 text-center">
      <h3 className="text-lg font-semibold text-[#F5F5F5]">{title}</h3>
      {body ? <p className="mt-2 text-sm text-[#A0A0A0]">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

const STATUS_CLASSES: Record<InvoiceStatus, string> = {
  draft: "bg-[#1C1C1C] text-[#A0A0A0]",
  sent: "bg-[#1E1B4B] text-[#6366F1]",
  partial: "bg-[#431407] text-[#F59E0B]",
  paid: "bg-[#052E16] text-[#22C55E]",
  overdue: "bg-[#450A0A] text-[#EF4444]",
  void: "bg-[#171717] text-[#6B6B6B]",
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${STATUS_CLASSES[status]}`}>
      {formatStatus(status)}
    </span>
  );
}

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-[500px] rounded-2xl border border-[#2E2E2E] bg-[#242424] p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-[#F5F5F5]">{title}</h2>
          <button type="button" className="text-sm text-[#A0A0A0] hover:text-[#F5F5F5]" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-2 text-xs text-[#EF4444]">{message}</p> : null;
}
