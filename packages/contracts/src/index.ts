/**
 * @atlascloud/contracts
 * Shared message contracts between API (publisher) and Worker (consumer).
 * These types ensure type-safe message passing over RabbitMQ.
 */

// Job message types
export type JobType = 'PROJECT_REPORT' | 'DATA_EXPORT';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

/**
 * Message published to the jobs queue when a job is submitted.
 * Worker consumes this to begin processing.
 */
export interface JobSubmittedMessage {
  jobId: string;
  organizationId: string;
  projectId?: string;
  type: JobType;
  payload: Record<string, unknown>;
  requestedById: string;
  idempotencyKey?: string;
  submittedAt: string; // ISO 8601
}

/**
 * Project report job payload (validated by API before enqueue).
 */
export interface ProjectReportPayload {
  projectId: string;
  includeJobs: boolean;
  format: 'json' | 'csv';
}

/**
 * Data export job payload.
 */
export interface DataExportPayload {
  resourceType: 'projects' | 'jobs' | 'members';
  format: 'json' | 'csv';
  filters?: Record<string, string>;
}

// Outbox event types
export type OutboxEventType = 'job.submitted' | 'job.completed' | 'job.failed' | 'job.cancelled';

export interface OutboxEventPayload {
  eventId: string;
  eventType: OutboxEventType;
  aggregateId: string;
  aggregateType: string;
  payload: Record<string, unknown>;
  occurredAt: string; // ISO 8601
}
