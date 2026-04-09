import { Module } from '@nestjs/common'
import { DatabaseModule } from './database.module'
import { LeadsController } from '@/infra/http/controllers/leads.controller'
import { PipelinesController } from '@/infra/http/controllers/pipelines.controller'
import { LeadFieldConfigsController } from '@/infra/http/controllers/lead-field-configs.controller'
import { CreateLeadUseCase } from '@/domain/leads/application/use-cases/create-lead/create-lead.use-case'
import { ListLeadsUseCase } from '@/domain/leads/application/use-cases/list-leads/list-leads.use-case'
import { GetLeadUseCase } from '@/domain/leads/application/use-cases/get-lead/get-lead.use-case'
import { UpdateLeadUseCase } from '@/domain/leads/application/use-cases/update-lead/update-lead.use-case'
import { SoftDeleteLeadUseCase } from '@/domain/leads/application/use-cases/soft-delete-lead/soft-delete-lead.use-case'
import { RestoreLeadUseCase } from '@/domain/leads/application/use-cases/restore-lead/restore-lead.use-case'
import { ListLeadFieldConfigsUseCase } from '@/domain/leads/application/use-cases/list-lead-field-configs/list-lead-field-configs.use-case'
import { CreateLeadFieldConfigUseCase } from '@/domain/leads/application/use-cases/create-lead-field-config/create-lead-field-config.use-case'
import { UpdateLeadFieldConfigUseCase } from '@/domain/leads/application/use-cases/update-lead-field-config/update-lead-field-config.use-case'
import { DeleteLeadFieldConfigUseCase } from '@/domain/leads/application/use-cases/delete-lead-field-config/delete-lead-field-config.use-case'
import { ReorderLeadFieldConfigsUseCase } from '@/domain/leads/application/use-cases/reorder-lead-field-configs/reorder-lead-field-configs.use-case'
import { CreatePipelineUseCase } from '@/domain/pipelines/application/use-cases/create-pipeline/create-pipeline.use-case'
import { UpdatePipelineUseCase } from '@/domain/pipelines/application/use-cases/update-pipeline/update-pipeline.use-case'
import { DeletePipelineUseCase } from '@/domain/pipelines/application/use-cases/delete-pipeline/delete-pipeline.use-case'
import { ListPipelinesUseCase } from '@/domain/pipelines/application/use-cases/list-pipelines/list-pipelines.use-case'
import { CreateStageUseCase } from '@/domain/pipelines/application/use-cases/create-stage/create-stage.use-case'
import { ListStagesUseCase } from '@/domain/pipelines/application/use-cases/list-stages/list-stages.use-case'
import { UpdateStageUseCase } from '@/domain/pipelines/application/use-cases/update-stage/update-stage.use-case'
import { ReorderStagesUseCase } from '@/domain/pipelines/application/use-cases/reorder-stages/reorder-stages.use-case'

@Module({
  imports: [DatabaseModule],
  controllers: [LeadsController, PipelinesController, LeadFieldConfigsController],
  providers: [
    CreateLeadUseCase,
    ListLeadsUseCase,
    GetLeadUseCase,
    UpdateLeadUseCase,
    SoftDeleteLeadUseCase,
    RestoreLeadUseCase,
    ListLeadFieldConfigsUseCase,
    CreateLeadFieldConfigUseCase,
    UpdateLeadFieldConfigUseCase,
    DeleteLeadFieldConfigUseCase,
    ReorderLeadFieldConfigsUseCase,
    CreatePipelineUseCase,
    UpdatePipelineUseCase,
    DeletePipelineUseCase,
    ListPipelinesUseCase,
    CreateStageUseCase,
    ListStagesUseCase,
    UpdateStageUseCase,
    ReorderStagesUseCase,
  ],
})
export class CrmModule {}
