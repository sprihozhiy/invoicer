import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import { nowIso } from "@/lib/time";
import { randomToken, sha256, uuid } from "@/lib/ids";
import { store } from "@/lib/store";
import { StoredUser } from "@/lib/models";

const ACCESS_COOKIE = "invoicer_access";
const REFRESH_COOKIE = "invoicer_refresh";
const ACCESS_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function expiresAfter(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

function parseIsoMs(iso: string): number {
  return new Date(iso).getTime();
}

export function hashPassword(password: string): string {
  return crypto.scryptSync(password, "invoicer-salt", 64).toString("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function sanitizeUser(user: StoredUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function issueSession(userId: string): { accessToken: string; refreshToken: string } {
  const accessToken = `at_${randomToken(24)}`;
  const refreshToken = `rt_${randomToken(32)}`;

  store.accessTokens.push({ token: accessToken, userId, expiresAt: expiresAfter(ACCESS_TTL_MS) });
  store.refreshTokens.push({
    id: uuid(),
    userId,
    tokenHash: sha256(refreshToken),
    createdAt: nowIso(),
    expiresAt: expiresAfter(REFRESH_TTL_MS),
    usedAt: null,
  });

  return { accessToken, refreshToken };
}

export function setSessionCookies(response: NextResponse, tokens: { accessToken: string; refreshToken: string }): void {
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: ACCESS_TTL_MS / 1000,
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_TTL_MS / 1000,
  });
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    expires: new Date(0),
  });
  response.cookies.set(REFRESH_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    expires: new Date(0),
  });
}

export function requireAuth(req: NextRequest): StoredUser {
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) {
    apiError(401, "UNAUTHORIZED", "Authentication required.");
  }
  const session = store.accessTokens.find((item) => item.token === token);
  if (!session || parseIsoMs(session.expiresAt) < Date.now()) {
    apiError(401, "UNAUTHORIZED", "Authentication required.");
  }
  const user = store.users.find((u) => u.id === session.userId);
  if (!user) {
    apiError(401, "UNAUTHORIZED", "Authentication required.");
  }
  return user;
}

export function rotateRefreshToken(oldRawToken: string): { userId: string; tokens: { accessToken: string; refreshToken: string } } {
  const tokenHash = sha256(oldRawToken);
  const token = store.refreshTokens.find((item) => item.tokenHash === tokenHash);

  if (!token || token.usedAt || parseIsoMs(token.expiresAt) < Date.now()) {
    apiError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid.");
  }

  token.usedAt = nowIso();

  const tokens = issueSession(token.userId);
  return { userId: token.userId, tokens };
}

export function invalidateRefreshToken(rawToken: string | undefined): void {
  if (!rawToken) {
    return;
  }
  const tokenHash = sha256(rawToken);
  const token = store.refreshTokens.find((item) => item.tokenHash === tokenHash);
  if (token && !token.usedAt) {
    token.usedAt = nowIso();
  }
}

export function getRefreshCookie(req: NextRequest): string {
  const token = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!token) {
    apiError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid.");
  }
  return token;
}
