/**
 * @atlascloud/testing
 * Shared test utilities, factories, and helpers.
 * Used by both apps/api and apps/worker test suites.
 */

import { randomUUID } from 'crypto';

// ── Entity factories ──────────────────────────────────────────────────────────

export interface TestOrganization {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  createdAt: Date;
  updatedAt: Date;
}

export interface TestUser {
  id: string;
  email: string;
  displayName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BANNED';
  isPlatformAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function buildTestOrganization(overrides: Partial<TestOrganization> = {}): TestOrganization {
  const name = overrides.name ?? `Test Org ${randomUUID().slice(0, 8)}`;
  return {
    id: randomUUID(),
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function buildTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: randomUUID(),
    email: `user-${randomUUID().slice(0, 8)}@test.local`,
    displayName: 'Test User',
    status: 'ACTIVE',
    isPlatformAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ── Test database helpers ─────────────────────────────────────────────────────

/**
 * Generate a unique email for test isolation.
 */
export function uniqueEmail(): string {
  return `test-${randomUUID().slice(0, 8)}@atlascloud.test`;
}

/**
 * Generate a unique slug for test isolation.
 */
export function uniqueSlug(): string {
  return `test-org-${randomUUID().slice(0, 8)}`;
}

// ── JWT test helpers ──────────────────────────────────────────────────────────

export const TEST_SECRETS = {
  ACCESS: 'test-access-secret-min-64-chars-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  REFRESH: 'test-refresh-secret-min-64-chars-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
} as const;
