import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { QueueService } from './queue.service';

/**
 * QueueModule sets up BullMQ for job queuing.
 * Redis connection is optional — if REDIS_URL is not set, jobs won't be enqueued.
 * Worker logic lives in apps/worker; the API only enqueues jobs.
 */
@Module({
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly queueService: QueueService) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.init();
  }

  async onModuleDestroy(): Promise<void> {
    await this.queueService.shutdown();
  }
}
