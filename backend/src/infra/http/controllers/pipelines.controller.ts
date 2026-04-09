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
import { UpdateStageUseCase } from '@/domain/pipelines/application/use-cases/update-stage/update-stage.use-case'
import { ReorderStagesUseCase } from '@/domain/pipelines/application/use-cases/reorder-stages/reorder-stages.use-case'
import { CreatePipelineDto } from '../dtos/create-pipeline.dto'
import { UpdatePipelineDto } from '../dtos/update-pipeline.dto'
import { CreateStageDto } from '../dtos/create-stage.dto'
import { UpdateStageDto } from '../dtos/update-stage.dto'
import { ReorderStagesDto } from '../dtos/reorder-stages.dto'
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
    private readonly updateStageUseCase: UpdateStageUseCase,
    private readonly reorderStagesUseCase: ReorderStagesUseCase,
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

  // ─── PATCH /pipelines/:id/stages/reorder ─────────────────────────────────────
  // NOTE: must be declared BEFORE :stageId to avoid Express matching "reorder" as a param

  @Patch(':id/stages/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reorder stages within a pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({ status: 204, description: 'Stages reordered.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Pipeline not found.' })
  async reorderStages(
    @Param('id') pipelineId: string,
    @Body() dto: ReorderStagesDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const result = await this.reorderStagesUseCase.execute({
      pipelineId,
      tenantId: user.tenantId,
      actorRole: user.role as RoleType,
      order: dto.order,
    })
    if (result.isLeft()) throw result.value
  }

  // ─── PATCH /pipelines/:id/stages/:stageId ─────────────────────────────────────

  @Patch(':id/stages/:stageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a stage name or color' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiParam({ name: 'stageId', description: 'Stage ID' })
  @ApiResponse({ status: 200, description: 'Updated stage.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Stage not found.' })
  async updateStage(
    @Param('id') pipelineId: string,
    @Param('stageId') stageId: string,
    @Body() dto: UpdateStageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const result = await this.updateStageUseCase.execute({
      stageId,
      pipelineId,
      tenantId: user.tenantId,
      actorRole: user.role as RoleType,
      name: dto.name,
      color: dto.color,
    })
    if (result.isLeft()) throw result.value
    return StagePresenter.toHttp(result.value.stage)
  }
}
