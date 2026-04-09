import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { CurrentUser, CurrentUserPayload } from '@/infra/auth/decorators/current-user.decorator'
import { CreatePipelineUseCase } from '@/domain/pipelines/application/use-cases/create-pipeline/create-pipeline.use-case'
import { UpdatePipelineUseCase } from '@/domain/pipelines/application/use-cases/update-pipeline/update-pipeline.use-case'
import { DeletePipelineUseCase } from '@/domain/pipelines/application/use-cases/delete-pipeline/delete-pipeline.use-case'
import { ListPipelinesUseCase } from '@/domain/pipelines/application/use-cases/list-pipelines/list-pipelines.use-case'
import { CreateStageUseCase } from '@/domain/pipelines/application/use-cases/create-stage/create-stage.use-case'
import { ListStagesUseCase } from '@/domain/pipelines/application/use-cases/list-stages/list-stages.use-case'
import { CreatePipelineDto } from '../dtos/create-pipeline.dto'
import { UpdatePipelineDto } from '../dtos/update-pipeline.dto'
import { CreateStageDto } from '../dtos/create-stage.dto'
import { RoleType } from '@/domain/auth/enterprise/value-objects/user-role.vo'
import { PipelinePresenter, StagePresenter } from '../presenters/pipeline.presenter'

@ApiTags('pipelines')
@ApiBearerAuth('access-token')
@Controller('pipelines')
export class PipelinesController {
  constructor(
    private readonly createPipelineUseCase: CreatePipelineUseCase,
    private readonly updatePipelineUseCase: UpdatePipelineUseCase,
    private readonly deletePipelineUseCase: DeletePipelineUseCase,
    private readonly listPipelinesUseCase: ListPipelinesUseCase,
    private readonly createStageUseCase: CreateStageUseCase,
    private readonly listStagesUseCase: ListStagesUseCase,
  ) {}

  // ─── GET /pipelines ──────────────────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all pipelines for the current tenant' })
  @ApiResponse({ status: 200, description: 'List of pipelines.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  async list(@CurrentUser() user: CurrentUserPayload) {
    const result = await this.listPipelinesUseCase.execute({
      tenantId: user.tenantId,
    })
    if (result.isLeft()) throw result.value
    return PipelinePresenter.toHttpList(result.value)
  }

  // ─── POST /pipelines ─────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new pipeline' })
  @ApiResponse({ status: 201, description: 'Pipeline created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  async create(@Body() dto: CreatePipelineDto, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.createPipelineUseCase.execute({
      tenantId: user.tenantId,
      name: dto.name,
      actorRole: user.role as RoleType,
    })
    if (result.isLeft()) throw result.value
    return {
      id: result.value.pipelineId,
      tenantId: user.tenantId,
      name: dto.name,
      isActive: true,
    }
  }

  // ─── PATCH /pipelines/:id ─────────────────────────────────────────────────────

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({ status: 200, description: 'Updated pipeline data.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Pipeline not found.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePipelineDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const result = await this.updatePipelineUseCase.execute({
      pipelineId: id,
      tenantId: user.tenantId,
      actorRole: user.role as RoleType,
      updates: {
        name: dto.name,
        isActive: dto.isActive,
      },
    })
    if (result.isLeft()) throw result.value
    return PipelinePresenter.toHttp(result.value)
  }

  // ─── DELETE /pipelines/:id ────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({ status: 204, description: 'Pipeline deleted.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Pipeline not found.' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.deletePipelineUseCase.execute({
      pipelineId: id,
      tenantId: user.tenantId,
      actorRole: user.role as RoleType,
    })
    if (result.isLeft()) throw result.value
  }

  // ─── GET /pipelines/:id/stages ────────────────────────────────────────────────

  @Get(':id/stages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all stages for a pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({ status: 200, description: 'List of stages.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @ApiResponse({ status: 404, description: 'Pipeline not found.' })
  async listStages(@Param('id') pipelineId: string, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.listStagesUseCase.execute({
      pipelineId,
      tenantId: user.tenantId,
    })
    if (result.isLeft()) throw result.value
    return StagePresenter.toHttpList(result.value)
  }

  // ─── POST /pipelines/:id/stages ───────────────────────────────────────────────

  @Post(':id/stages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a stage within a pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({ status: 201, description: 'Stage created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Pipeline not found.' })
  async createStage(
    @Param('id') pipelineId: string,
    @Body() dto: CreateStageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const result = await this.createStageUseCase.execute({
      pipelineId,
      tenantId: user.tenantId,
      name: dto.name,
      order: dto.order,
      color: dto.color,
      actorRole: user.role as RoleType,
    })
    if (result.isLeft()) throw result.value
    return {
      id: result.value.stageId,
      pipelineId,
      name: dto.name,
      order: dto.order ?? 0,
      color: dto.color,
    }
  }
}
