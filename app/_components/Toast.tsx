"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={16} strokeWidth={1.5} style={{ color: "#22c55e" }} />,
  error: <AlertCircle size={16} strokeWidth={1.5} style={{ color: "#ef4444" }} />,
  info: <Info size={16} strokeWidth={1.5} style={{ color: "#6366f1" }} />,
};

function ToastItem({ t, onRemove }: { t: Toast; onRemove: (id: string) => void }) {
  return (
    <div
      className={`${t.exiting ? "toast-exit" : "toast-enter"} flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg`}
      style={{
        backgroundColor: "var(--bg-elevated)",
        borderColor: "var(--border-primary)",
        minWidth: "280px",
        maxWidth: "400px",
      }}
    >
      <span className="flex-shrink-0">{ICONS[t.type]}</span>
      <p className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>
        {t.message}
      </p>
      <button
        onClick={() => onRemove(t.id)}
        className="flex-shrink-0 rounded p-0.5 transition-colors"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
      >
        <X size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, type }]);

      const timer = setTimeout(() => removeToast(id), 4000);
      timersRef.current.set(id, timer);
    },
    [removeToast],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
          {toasts.map((t) => (
            <ToastItem key={t.id} t={t} onRemove={removeToast} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
