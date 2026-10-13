import { Injectable, OnModuleInit } from '@nestjs/common';
import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge, register } from 'prom-client';

/**
 * Centralized metrics registry.
 * All application metrics are defined here and injected where needed.
 *
 * Naming convention: atlascloud_<subsystem>_<metric>_<unit>
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  public readonly registry: Registry;

  // ── HTTP metrics ────────────────────────────────────────────────────────────
  public readonly httpRequestsTotal: Counter;
  public readonly httpRequestDurationSeconds: Histogram;
  public readonly httpActiveRequests: Gauge;

  // ── Job metrics (populated by worker, exposed via shared registry in future) ─
  public readonly jobsProcessedTotal: Counter;
  public readonly jobFailuresTotal: Counter;
  public readonly jobDurationSeconds: Histogram;
  public readonly jobRetryTotal: Counter;
  public readonly outboxBacklog: Gauge;

  // ── Database metrics ────────────────────────────────────────────────────────
  public readonly dbQueryDurationSeconds: Histogram;

  // ── Cache metrics ───────────────────────────────────────────────────────────
  public readonly cacheHitsTotal: Counter;
  public readonly cacheMissesTotal: Counter;

  constructor() {
    this.registry = register;

    // Collect Node.js default metrics (event loop, GC, memory, etc.)
    collectDefaultMetrics({ register: this.registry, prefix: 'atlascloud_' });

    // HTTP
    this.httpRequestsTotal = new Counter({
      name: 'atlascloud_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDurationSeconds = new Histogram({
      name: 'atlascloud_http_request_duration_seconds',
      help: 'HTTP request latency in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.httpActiveRequests = new Gauge({
      name: 'atlascloud_http_active_requests',
      help: 'Number of currently active HTTP requests',
      registers: [this.registry],
    });

    // Jobs
    this.jobsProcessedTotal = new Counter({
      name: 'atlascloud_jobs_processed_total',
      help: 'Total number of jobs processed',
      labelNames: ['type', 'status'],
      registers: [this.registry],
    });

    this.jobFailuresTotal = new Counter({
      name: 'atlascloud_job_failures_total',
      help: 'Total number of job failures',
      labelNames: ['type', 'failure_code'],
      registers: [this.registry],
    });

    this.jobDurationSeconds = new Histogram({
      name: 'atlascloud_job_duration_seconds',
      help: 'Job processing duration in seconds',
      labelNames: ['type'],
      buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300],
      registers: [this.registry],
    });

    this.jobRetryTotal = new Counter({
      name: 'atlascloud_job_retries_total',
      help: 'Total number of job retries',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.outboxBacklog = new Gauge({
      name: 'atlascloud_outbox_backlog',
      help: 'Number of unpublished outbox events',
      registers: [this.registry],
    });

    // Database
    this.dbQueryDurationSeconds = new Histogram({
      name: 'atlascloud_db_query_duration_seconds',
      help: 'Database query latency in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });

    // Cache
    this.cacheHitsTotal = new Counter({
      name: 'atlascloud_cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache'],
      registers: [this.registry],
    });

    this.cacheMissesTotal = new Counter({
      name: 'atlascloud_cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache'],
      registers: [this.registry],
    });
  }

  onModuleInit(): void {
    // Metrics are initialized in constructor
  }
}
