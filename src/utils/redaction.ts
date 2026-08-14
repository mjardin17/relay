/**
 * Centralized, reusable redaction utility for Relay.
 * Ensures private street addresses, emails, credentials, and sensitive data
 * are never exposed in console output, CI logs, telemetry, error messages, or shared audit reports.
 */

export function maskStreetAddress(address: string | null | undefined): string {
  if (!address || typeof address !== 'string') return '';
  const trimmed = address.trim();
  if (!trimmed) return '';

  // Extract leading house/building number if present (e.g., "1420 SW 5th Ave" -> "1420 ***")
  const match = trimmed.match(/^(\d+[\w-]*)\s+(.+)$/);
  if (match) {
    return `${match[1]} ***`;
  }

  return '[REDACTED_ADDRESS]';
}

export function redactText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return text || '';

  let sanitized = text;

  // Redact email addresses
  sanitized = sanitized.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    '[REDACTED_EMAIL]'
  );

  // Redact phone numbers
  sanitized = sanitized.replace(
    /\b(?:\+?1[-. \t]?)?(?:\(?\d{3}\)?[-. \t]?)?\d{3}[-. \t]?\d{4}\b/g,
    '[REDACTED_PHONE]'
  );

  // Redact street address pattern in free text (e.g., "1420 SW 5th Ave" -> "1420 ***")
  sanitized = sanitized.replace(
    /\b(\d{1,5})\s+([A-Za-z0-9\s.,#-]{3,35}\b(?:Ave|Avenue|St|Street|Rd|Road|Blvd|Boulevard|Dr|Drive|Way|Ln|Lane|Ct|Court|Pl|Place|Ste|Suite))\b/gi,
    (_match, num) => `${num} ***`
  );

  return sanitized;
}

const ADDRESS_KEYS = new Set([
  'privatestreetaddress',
  'private_street_address',
  'privatestreet',
  'private_street',
  'privateaddress',
  'private_address',
  'streetaddress',
  'street_address',
  'street',
  'address',
  'addressline1',
  'address_line1',
  'addressline2',
  'address_line2',
  'locationaddress',
  'location_address',
]);

const UNIT_KEYS = new Set([
  'privateunit',
  'private_unit',
  'unit',
  'suite',
  'apt',
]);

const SENSITIVE_KEYS = new Set([
  'token',
  'secret',
  'password',
  'key',
  'credential',
  'authorization',
  'bearer',
  'cookie',
  'ssn',
  'ein',
  'taxid',
]);

export function redactObject(obj: any, visited = new WeakSet()): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return redactText(obj);
    }
    return obj;
  }

  if (visited.has(obj)) {
    return '[CIRCULAR_REFERENCE]';
  }
  visited.add(obj);

  // Handle Error objects
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: redactText(obj.message),
      stack: obj.stack ? redactText(obj.stack) : undefined,
    };
  }

  // Handle Arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, visited));
  }

  const redacted: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    if (ADDRESS_KEYS.has(lowerKey)) {
      if (typeof value === 'string') {
        redacted[key] = maskStreetAddress(value);
      } else {
        redacted[key] = '[REDACTED_ADDRESS]';
      }
    } else if (UNIT_KEYS.has(lowerKey)) {
      redacted[key] = '[REDACTED_UNIT]';
    } else if (lowerKey.includes('email')) {
      redacted[key] = '[REDACTED_EMAIL]';
    } else if (SENSITIVE_KEYS.has(lowerKey) || SENSITIVE_KEYS.has(key)) {
      redacted[key] = '[REDACTED_SENSITIVE_DATA]';
    } else if (lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token')) {
      redacted[key] = '[REDACTED_SENSITIVE_DATA]';
    } else if (typeof value === 'string') {
      // Check if value is stringified JSON
      if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
        try {
          const parsed = JSON.parse(value);
          const redactedParsed = redactObject(parsed, visited);
          redacted[key] = JSON.stringify(redactedParsed);
        } catch {
          redacted[key] = redactText(value);
        }
      } else {
        redacted[key] = redactText(value);
      }
    } else {
      redacted[key] = redactObject(value, visited);
    }
  }

  return redacted;
}
