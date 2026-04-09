import { Module } from '@nestjs/common'
import { DatabaseModule } from './database.module'
import { LeadsController } from '@/infra/http/controllers/leads.controller'
import { PipelinesController } from '@/infra/http/controllers/pipelines.controller'
import { CreateLeadUseCase } from '@/domain/leads/application/use-cases/create-lead/create-lead.use-case'
import { ListLeadsUseCase } from '@/domain/leads/application/use-cases/list-leads/list-leads.use-case'
import { GetLeadUseCase } from '@/domain/leads/application/use-cases/get-lead/get-lead.use-case'
import { UpdateLeadUseCase } from '@/domain/leads/application/use-cases/update-lead/update-lead.use-case'
import { SoftDeleteLeadUseCase } from '@/domain/leads/application/use-cases/soft-delete-lead/soft-delete-lead.use-case'
import { RestoreLeadUseCase } from '@/domain/leads/application/use-cases/restore-lead/restore-lead.use-case'
import { CreatePipelineUseCase } from '@/domain/pipelines/application/use-cases/create-pipeline/create-pipeline.use-case'
import { UpdatePipelineUseCase } from '@/domain/pipelines/application/use-cases/update-pipeline/update-pipeline.use-case'
import { DeletePipelineUseCase } from '@/domain/pipelines/application/use-cases/delete-pipeline/delete-pipeline.use-case'
import { ListPipelinesUseCase } from '@/domain/pipelines/application/use-cases/list-pipelines/list-pipelines.use-case'
import { CreateStageUseCase } from '@/domain/pipelines/application/use-cases/create-stage/create-stage.use-case'
import { ListStagesUseCase } from '@/domain/pipelines/application/use-cases/list-stages/list-stages.use-case'

@Module({
  imports: [DatabaseModule],
  controllers: [LeadsController, PipelinesController],
  providers: [
    CreateLeadUseCase,
    ListLeadsUseCase,
    GetLeadUseCase,
    UpdateLeadUseCase,
    SoftDeleteLeadUseCase,
    RestoreLeadUseCase,
    CreatePipelineUseCase,
    UpdatePipelineUseCase,
    DeletePipelineUseCase,
    ListPipelinesUseCase,
    CreateStageUseCase,
    ListStagesUseCase,
  ],
})
export class CrmModule {}
