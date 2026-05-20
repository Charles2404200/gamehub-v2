import { Module } from '@nestjs/common';

/**
 * QueueModule sets up BullMQ workers.
 * Redis connection is optional — if REDIS_URL is not set, jobs run synchronously.
 * Worker logic lives in apps/worker; the API only enqueues jobs.
 */
@Module({})
export class QueueModule {}
