import dns from "node:dns/promises";
import net from "node:net";

import { apiError } from "@/lib/api";

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

function isPrivateIPv4(ip: string): boolean {
  const octets = ip.split(".").map(Number);
  if (octets.length !== 4 || octets.some(Number.isNaN)) {
    return true;
  }
  const [a, b] = octets;
  if (a === 10 || a === 127 || a === 0) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 100 && b >= 64 && b <= 127) {
    return true;
  }
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") {
    return true;
  }
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }
  if (normalized.startsWith("fe80:")) {
    return true;
  }
  return false;
}

async function assertNoSsrf(url: URL): Promise<void> {
  const hostname = url.hostname;
  if (hostname === "localhost") {
    apiError(400, "SSRF_BLOCKED", "Target URL is not allowed.");
  }
  const lookup = await dns.lookup(hostname, { all: true });
  for (const entry of lookup) {
    const type = net.isIP(entry.address);
    if (type === 4 && isPrivateIPv4(entry.address)) {
      apiError(400, "SSRF_BLOCKED", "Target URL is not allowed.");
    }
    if (type === 6 && isPrivateIPv6(entry.address)) {
      apiError(400, "SSRF_BLOCKED", "Target URL is not allowed.");
    }
  }
}

export async function safeFetch(
  urlString: string,
  options?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxBytes = DEFAULT_MAX_BYTES,
): Promise<{ response: Response; body: Buffer }> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    apiError(400, "VALIDATION_ERROR", "Invalid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    apiError(400, "VALIDATION_ERROR", "Only HTTP(S) URLs are allowed.");
  }

  await assertNoSsrf(url);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: "error",
      cache: "no-store",
    });

    const reader = response.body?.getReader();
    if (!reader) {
      return { response, body: Buffer.alloc(0) };
    }

    const chunks: Uint8Array[] = [];
    let size = 0;

    while (true) {
      const result = await reader.read();
      if (result.done) {
        break;
      }
      size += result.value.byteLength;
      if (size > maxBytes) {
        apiError(413, "RESPONSE_TOO_LARGE", "Upstream response too large.");
      }
      chunks.push(result.value);
    }

    return { response, body: Buffer.concat(chunks.map((c) => Buffer.from(c))) };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      apiError(504, "UPSTREAM_TIMEOUT", "Upstream request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
