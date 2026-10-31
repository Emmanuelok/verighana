import {createNeonAuth} from '@neondatabase/auth/next/server';
import {z} from 'zod';
import {OperationError, type Principal} from './operations/core';

type FullviewAuth = ReturnType<typeof createNeonAuth>;
let instance: FullviewAuth | undefined;
const emailSchema = z.string().trim().email().max(254).transform(value => value.toLowerCase());

export function normalizeAuthenticationEmail(value: unknown): string|null {
  const result = emailSchema.safeParse(value);
  return result.success ? result.data : null;
}

function validationEmails(): string[]|null {
  const list = process.env.FULLVIEW_AUTH_TEST_EMAILS;
  if (list === undefined) {
    const email = normalizeAuthenticationEmail(process.env.FULLVIEW_AUTH_TEST_EMAIL);
    return email ? [email] : null;
  }
  // An explicitly present list replaces the legacy setting; malformed lists never fall back.
  if (list.length > 1024) return null;
  const entries = list.split(/\r?\n|,/);
  if (entries.length > 3) return null;
  const emails: string[] = [];
  for (const entry of entries) {
    const email = normalizeAuthenticationEmail(entry);
    if (!email || emails.includes(email)) return null;
    emails.push(email);
  }
  return emails;
}

function configuration() {
  if (process.env.FULLVIEW_AUTH_ENABLED !== 'true') return null;
  const mode = process.env.FULLVIEW_AUTH_MODE;
  if (mode !== 'validation' && mode !== 'public') return null;
  const testEmails = mode === 'validation' ? validationEmails() : [];
  if (!testEmails) return null;
  const baseUrl = process.env.FULLVIEW_NEON_AUTH_BASE_URL;
  const secret = process.env.FULLVIEW_AUTH_COOKIE_SECRET;
  const appOrigin = process.env.FULLVIEW_APP_ORIGIN;
  if (!baseUrl || !secret || secret.length < 32 || !appOrigin) return null;
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.neon.tech') ||
      !url.pathname.endsWith('/auth') || url.username || url.password || url.search || url.hash) return null;
    const app = new URL(appOrigin);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(app.hostname);
    if ((app.protocol !== 'https:' && !(loopback && app.protocol === 'http:')) ||
      app.username || app.password || app.search || app.hash || app.pathname !== '/') return null;
    return {baseUrl, secret, appOrigin: app.origin, mode, testEmails} as const;
  } catch {return null;}
}

export function authConfigured(): boolean { return configuration() !== null; }
export const authenticationConfigured = authConfigured;
export function authenticationOrigin(): string|null {return configuration()?.appOrigin ?? null;}
export function authenticationMode(): 'validation'|'public'|null {return configuration()?.mode ?? null;}
export function authenticationEmailAllowed(email: unknown): boolean {
  const config = configuration();
  const normalized = normalizeAuthenticationEmail(email);
  return !!config && !!normalized && (config.mode === 'public' || config.testEmails.includes(normalized));
}

export function getFullviewAuth(): FullviewAuth {
  const config = configuration();
  if (!config) throw new OperationError(503, 'auth_unavailable', 'Online accounts are being connected. Your local research desk remains available.');
  instance ??= createNeonAuth({
    baseUrl: config.baseUrl,
    // No shared-domain cookie; protected operations bypass the session-data cache below.
    cookies: {secret: config.secret, sameSite: 'strict'},
    logLevel: 'silent',
  });
  return instance;
}

/** The managed provider validates the session; caller-supplied identity headers are never used. */
export async function getPrincipal(): Promise<Principal | null> {
  const auth = getFullviewAuth();
  try {
    const {data, error} = await auth.getSession({query: {disableCookieCache: 'true'}});
    if (error) throw new Error('Session provider unavailable');
    if (!data?.user) return null;
    const {id, email, emailVerified} = data.user;
    if (typeof id !== 'string' || !id || typeof email !== 'string' || !email) {
      throw new Error('Invalid managed session');
    }
    if (!authenticationEmailAllowed(email)) return null;
    return {id, email, emailVerified: emailVerified === true};
  } catch {
    throw new OperationError(503, 'auth_unavailable', 'Your session could not be checked. Please try again.');
  }
}
