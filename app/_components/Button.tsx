"use client";

import { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const SIZES: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] hover:bg-[var(--accent-hover)] hover:border-[var(--accent-hover)] active:bg-[var(--accent-active)]",
  secondary:
    "bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-primary)] hover:bg-[var(--bg-hover)]",
  danger:
    "bg-transparent text-[var(--danger-fg)] border-[var(--danger-fg)] hover:bg-[var(--danger-bg)]",
  ghost:
    "bg-transparent text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
};

export function Button({
  variant = "primary",
  loading = false,
  size = "md",
  children,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
    >
      {loading && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-lg p-2 transition-colors text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)] ${className}`}
    >
      {children}
    </button>
  );
}
