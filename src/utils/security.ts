/**
 * Utilitas Keamanan Aplikasi SMANSATEKUN
 * Mencegah XSS via protokol URL berbahaya, Formula Injection CSV/Excel,
 * spoofing domain Instagram, karakter kontrol tersembunyi, dan spam penulisan.
 */

const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E]/g;
const HTML_TAG_REGEX = /<[^>]*>/g;
const SAFE_DATA_IMAGE_REGEX = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i;
const FORMULA_PREFIX_REGEX = /^[=+\-@\t\r]/;

export function sanitizeText(value: string | undefined | null, maxLen: number, fallback = ''): string {
  const cleaned = String(value ?? '')
    .replace(CONTROL_CHARS_REGEX, '')
    .replace(HTML_TAG_REGEX, '')
    .trim();
  if (!cleaned) return fallback.slice(0, maxLen);
  return cleaned.slice(0, maxLen);
}

export function sanitizeExternalUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.replace(CONTROL_CHARS_REGEX, '').trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    return parsed.toString().slice(0, 500);
  } catch {
    return null;
  }
}

export function sanitizeInstagramUrl(rawUrl: string): string | null {
  const safe = sanitizeExternalUrl(rawUrl);
  if (!safe) return null;
  try {
    const parsed = new URL(safe);
    const host = parsed.hostname.toLowerCase();
    if (host !== 'instagram.com' && host !== 'www.instagram.com') {
      return null;
    }
    if (parsed.protocol !== 'https:') {
      parsed.protocol = 'https:';
    }
    if (parsed.pathname.length < 2) {
      return null;
    }
    return parsed.toString().slice(0, 500);
  } catch {
    return null;
  }
}

export function sanitizeImageUrl(rawUrl: string | undefined | null): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.replace(CONTROL_CHARS_REGEX, '').trim();
  if (!trimmed) return null;

  // Izinkan aset lokal tepercaya
  if (trimmed.startsWith('/src/assets/') || trimmed.startsWith('/assets/')) {
    if (trimmed.includes('..')) return null;
    return trimmed.slice(0, 500);
  }

  // Izinkan data URL gambar raster saja (blokir SVG untuk mencegah XSS)
  if (trimmed.startsWith('data:')) {
    if (SAFE_DATA_IMAGE_REGEX.test(trimmed) && trimmed.length <= 200000) {
      return trimmed;
    }
    return null;
  }

  // Izinkan URL HTTP/HTTPS valid
  return sanitizeExternalUrl(trimmed);
}

export function sanitizeCsvFormula(value: string | number): string {
  const str = String(value ?? '').replace(CONTROL_CHARS_REGEX, '');
  if (FORMULA_PREFIX_REGEX.test(str)) {
    return `'${str}`;
  }
  return str;
}

export function emailToSafeDocId(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 128);
}

export function isValidEmailFormat(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed) && trimmed.length <= 160;
}

// Rate limiter sisi klien untuk mencegah spam/automasi penulisan beruntun
const rateBucket = new Map<string, number[]>();

export function checkClientRateLimit(
  actionKey: string,
  maxRequests = 15,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const timestamps = (rateBucket.get(actionKey) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    rateBucket.set(actionKey, timestamps);
    return false;
  }
  timestamps.push(now);
  rateBucket.set(actionKey, timestamps);
  return true;
}
