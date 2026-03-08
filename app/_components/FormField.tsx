"use client";

import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface LabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}

export function Label({ htmlFor, children, required }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-medium mb-2"
      style={{ color: "var(--text-secondary)" }}
    >
      {children}
      {required && <span style={{ color: "var(--danger-fg)" }} className="ml-0.5">*</span>}
    </label>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function Input({ error, className = "", ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`block w-full rounded-lg border px-4 py-3 text-sm transition-colors placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] ${className}`}
      style={{
        backgroundColor: "var(--bg-elevated)",
        borderColor: error ? "var(--danger-fg)" : "var(--border-primary)",
        color: "var(--text-primary)",
      }}
    />
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  children: React.ReactNode;
}

export function Select({ error, className = "", children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={`block w-full rounded-lg border px-4 py-3 text-sm transition-colors focus:outline-none focus:border-[var(--border-focus)] ${className}`}
      style={{
        backgroundColor: "var(--bg-elevated)",
        borderColor: error ? "var(--danger-fg)" : "var(--border-primary)",
        color: "var(--text-primary)",
      }}
    >
      {children}
    </select>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export function Textarea({ error, className = "", ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={`block w-full rounded-lg border px-4 py-3 text-sm transition-colors placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] resize-none ${className}`}
      style={{
        backgroundColor: "var(--bg-elevated)",
        borderColor: error ? "var(--danger-fg)" : "var(--border-primary)",
        color: "var(--text-primary)",
      }}
    />
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-xs" style={{ color: "var(--danger-fg)" }}>
      {message}
    </p>
  );
}

export function FormGroup({ children }: { children: React.ReactNode }) {
  return <div className="mb-5">{children}</div>;
}
