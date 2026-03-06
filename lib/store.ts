import { InMemoryStore } from "@/lib/models";

declare global {
  var __invoicer_store__: InMemoryStore | undefined;
}

function makeStore(): InMemoryStore {
  return {
    users: [],
    businessProfiles: [],
    clients: [],
    invoices: [],
    payments: [],
    catalogItems: [],
    refreshTokens: [],
    accessTokens: [],
    passwordResetTokens: [],
  };
}

export const store = globalThis.__invoicer_store__ ?? makeStore();
if (!globalThis.__invoicer_store__) {
  globalThis.__invoicer_store__ = store;
}
