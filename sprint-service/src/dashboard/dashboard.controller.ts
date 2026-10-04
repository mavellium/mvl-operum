import { Controller, Inject, Get, Post, Param, Body, Headers, BadRequestException } from '@nestjs/common'
import { TenantId } from '../common/tenant-scope'
import { DashboardService } from './dashboard.service'

@Controller()
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboardService: DashboardService) {}

  @Get('dashboard/global')
  global(@TenantId() tenantId: string, @Headers('x-authorized-projects') authorized?: string) {
    return this.dashboardService.getGlobalDashboard(tenantId, authorized?.split(',') ?? [])
  }

  @Get('sprints/:sprintId/dashboard')
  dashboard(@TenantId() tenantId: string, @Param('sprintId') sprintId: string) {
    return this.dashboardService.getSprintDashboard(tenantId, sprintId)
  }

  @Get('sprints/:sprintId/metrics')
  getMetrics(@TenantId() tenantId: string, @Param('sprintId') sprintId: string) {
    return this.dashboardService.getMetrics(tenantId, sprintId)
  }

  @Post('sprints/:sprintId/metrics')
  upsertMetric(
    @TenantId() tenantId: string,
    @Param('sprintId') sprintId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { horas?: number; tarefasPendentes?: number; custoTotal?: number; rankingPosicao?: number },
  ) {
    return this.dashboardService.upsertMetric(tenantId, sprintId, userId, body)
  }

  @Get('sprints/:sprintId/feedback')
  getFeedbacks(@TenantId() tenantId: string, @Param('sprintId') sprintId: string) {
    return this.dashboardService.getFeedbacks(tenantId, sprintId)
  }

  @Post('sprints/:sprintId/feedback')
  upsertFeedback(
    @TenantId() tenantId: string,
    @Param('sprintId') sprintId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { tarefasRealizadas?: string; dificuldades?: string; qualidade: number; dificuldade: number },
  ) {
    if (body.qualidade == null || body.dificuldade == null) {
      throw new BadRequestException('qualidade e dificuldade são obrigatórios')
    }
    return this.dashboardService.upsertFeedback(tenantId, sprintId, userId, body)
  }
}
