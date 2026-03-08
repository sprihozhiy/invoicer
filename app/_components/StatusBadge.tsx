import { STATUS_STYLES } from "../_lib/constants";
import { InvoiceStatus } from "../_lib/types";

interface Props {
  status: InvoiceStatus;
  className?: string;
}

const LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  partial: "Partial",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
};

export function StatusBadge({ status, className = "" }: Props) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
      style={{ color: style.fg, backgroundColor: style.bg }}
    >
      <span
        className="inline-block size-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: style.fg }}
      />
      {LABELS[status] ?? status}
    </span>
  );
}
