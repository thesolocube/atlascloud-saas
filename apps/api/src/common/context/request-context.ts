import { AsyncLocalStorage } from 'async_hooks';

import type { Request } from 'express';

export interface RequestContextData {
  requestId: string;
  request: Request;
  userId?: string;
  organizationId?: string;
}

/**
 * AsyncLocalStorage-based request context.
 * Provides access to the current request's data without prop-drilling.
 * Used by the metrics controller for header access without coupling.
 */
export class RequestContext {
  private static readonly storage = new AsyncLocalStorage<RequestContextData>();

  static run<T>(data: RequestContextData, fn: () => T): T {
    return RequestContext.storage.run(data, fn);
  }

  static current(): RequestContextData | undefined {
    return RequestContext.storage.getStore();
  }

  static getRequestId(): string | undefined {
    return RequestContext.storage.getStore()?.requestId;
  }

  static getUserId(): string | undefined {
    return RequestContext.storage.getStore()?.userId;
  }

  static getOrganizationId(): string | undefined {
    return RequestContext.storage.getStore()?.organizationId;
  }
}
