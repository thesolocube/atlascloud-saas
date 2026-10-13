import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route as public (no authentication required).
 * Used with the JwtAuthGuard to bypass authentication for health/metrics endpoints.
 *
 * @example
 * @Public()
 * @Get('health/live')
 * live() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
