import Link from "next/link";
import { ReactNode } from "react";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-[420px] rounded-2xl border border-[#2E2E2E] bg-[#1A1A1A] p-8">
        <Link href="/" className="text-sm text-[#A0A0A0] hover:text-[#F5F5F5]">Invoicer</Link>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.01em]">{title}</h1>
        <p className="mt-2 text-sm text-[#A0A0A0]">{subtitle}</p>
        <div className="mt-6">{children}</div>
        {footer ? <div className="mt-6 text-sm text-[#A0A0A0]">{footer}</div> : null}
      </div>
    </div>
  );
}
