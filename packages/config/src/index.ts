/**
 * @atlascloud/config
 * Shared configuration utilities and constants.
 */

// Queue names — shared between API (publisher) and Worker (consumer)
export const QUEUE_NAMES = {
  JOBS: 'atlascloud.jobs',
  JOBS_DLQ: 'atlascloud.jobs.dlq',
  OUTBOX: 'atlascloud.outbox',
} as const;

// Exchange names
export const EXCHANGE_NAMES = {
  JOBS: 'atlascloud.jobs',
  DLX: 'atlascloud.dlx',
} as const;

// Routing keys
export const ROUTING_KEYS = {
  JOB_SUBMITTED: 'job.submitted',
  JOB_CANCEL: 'job.cancel',
} as const;

// Job retry configuration
export const JOB_RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 1_000,
  MAX_DELAY_MS: 30_000,
  JITTER_FACTOR: 0.25,
} as const;

// Outbox publisher configuration
export const OUTBOX_CONFIG = {
  POLL_INTERVAL_MS: 5_000,
  BATCH_SIZE: 50,
  MAX_ATTEMPTS: 5,
  BASE_DELAY_MS: 2_000,
  MAX_DELAY_MS: 60_000,
} as const;

// Cache key prefixes — ensures tenant scoping and prevents collisions
export const CACHE_KEYS = {
  organization: (orgId: string) => `org:${orgId}`,
  organizationBySlug: (slug: string) => `org:slug:${slug}`,
  userMemberships: (userId: string) => `user:${userId}:memberships`,
  projectList: (orgId: string) => `org:${orgId}:projects`,
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
