import { Module } from '@nestjs/common'
import { DatabaseModule } from './database.module'
import { SeedService } from '@/infra/database/seed/seed.service'

@Module({
  imports: [DatabaseModule],
  providers: [SeedService],
})
export class SeedModule {}
