import { APPROVED_PREFIXES } from './synthetic-prefix';

type ApprovedTarget = 'local' | 'preview' | 'production';

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required E2E environment variable: ${name}`);
  }
  return value;
}

function validateApprovedTarget(value: string): asserts value is ApprovedTarget {
  if (value !== 'local' && value !== 'preview' && value !== 'production') {
    throw new Error('BUSINESS_DIRECT_E2E_TARGET must be one of local, preview, or production.');
  }
}

/**
 * The target approval must be one of the approved requirement prefixes.
 *
 * The check reads the requirement prefix the run is actually asserting on, so a
 * REQ-002 run passes its REQ-002 prefix and a REQ-001 prefix is still accepted.
 * The list is closed, so an unapproved or misspelled prefix fails closed.
 */
function validateApprovedPrefix(value: string): string {
  if (!APPROVED_PREFIXES.includes(value)) {
    throw new Error(
      `BUSINESS_DIRECT_E2E_TARGET_APPROVAL must be one of: ${APPROVED_PREFIXES.join(', ')}.`,
    );
  }
  return value;
}

function validateBaseUrl(target: ApprovedTarget, rawUrl: string): void {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('BUSINESS_DIRECT_E2E_BASE_URL must be a valid absolute URL.');
  }

  const isLoopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
  if (target === 'local' && !isLoopback) {
    throw new Error('A local E2E target must use a loopback BUSINESS_DIRECT_E2E_BASE_URL.');
  }
  if (target !== 'local' && (url.protocol !== 'https:' || isLoopback)) {
    throw new Error('A preview or production E2E target must use a non-loopback HTTPS BUSINESS_DIRECT_E2E_BASE_URL.');
  }
}

export default function globalSetup(): void {
  const target = requiredEnvironment('BUSINESS_DIRECT_E2E_TARGET');
  validateApprovedTarget(target);

  const approvedPrefix = validateApprovedPrefix(requiredEnvironment('BUSINESS_DIRECT_E2E_TARGET_APPROVAL'));

  validateBaseUrl(target, requiredEnvironment('BUSINESS_DIRECT_E2E_BASE_URL'));

  // The owner identity is a synthetic fixture, so it cannot be a real account.
  // It must also carry the same requirement prefix the run is approved for.
  for (const name of ['BUSINESS_DIRECT_E2E_OWNER_EMAIL', 'BUSINESS_DIRECT_E2E_OWNER_PASSWORD'] as const) {
    if (!requiredEnvironment(name).startsWith(approvedPrefix)) {
      throw new Error(`${name} must begin with the approved synthetic data prefix ${approvedPrefix}.`);
    }
  }
}
