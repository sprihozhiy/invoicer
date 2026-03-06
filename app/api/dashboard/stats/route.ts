import { NextRequest } from "next/server";

import { handleRouteError, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { getBusinessProfile } from "@/lib/domain";
import { toSummary } from "@/lib/invoices";
import { endOfMonthUtc, startOfMonthUtc, todayUtc } from "@/lib/time";
import { store } from "@/lib/store";

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const profile = getBusinessProfile(user.id);

    const invoices = store.invoices.filter(
      (invoice) => invoice.userId === user.id && invoice.deletedAt === null && invoice.currency === profile.defaultCurrency,
    );

    const totalOutstanding = invoices
      .filter((invoice) => invoice.status === "sent" || invoice.status === "partial")
      .reduce((sum, invoice) => sum + invoice.amountDue, 0);

    const totalOverdue = invoices
      .filter((invoice) => (invoice.status === "sent" || invoice.status === "partial") && invoice.dueDate < todayUtc())
      .reduce((sum, invoice) => sum + invoice.amountDue, 0);

    const monthStart = startOfMonthUtc();
    const monthEnd = endOfMonthUtc();

    const paidThisMonth = invoices
      .filter((invoice) => {
        if (invoice.status !== "paid" || !invoice.paidAt) {
          return false;
        }
        const paidAt = new Date(invoice.paidAt);
        return paidAt >= monthStart && paidAt <= monthEnd;
      })
      .reduce((sum, invoice) => sum + invoice.total, 0);

    const recentInvoices = [...invoices]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 5)
      .map((invoice) => {
        const clientName = store.clients.find((client) => client.id === invoice.clientId)?.name ?? "Unknown Client";
        return toSummary(invoice, clientName);
      });

    const overdueInvoices = invoices
      .filter((invoice) => (invoice.status === "sent" || invoice.status === "partial") && invoice.dueDate < todayUtc())
      .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1))
      .map((invoice) => {
        const clientName = store.clients.find((client) => client.id === invoice.clientId)?.name ?? "Unknown Client";
        return toSummary(invoice, clientName);
      });

    return successResponse(
      {
        totalOutstanding,
        totalOverdue,
        paidThisMonth,
        currency: profile.defaultCurrency,
        recentInvoices,
        overdueInvoices,
      },
      200,
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
