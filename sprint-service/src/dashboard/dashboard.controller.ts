import { Controller, Get, Post, Param, Body, Headers, BadRequestException } from '@nestjs/common'
import { DashboardService } from './dashboard.service'

@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('sprints/:sprintId/metrics')
  getMetrics(@Param('sprintId') sprintId: string) {
    return this.dashboardService.getMetrics(sprintId)
  }

  @Post('sprints/:sprintId/metrics')
  upsertMetric(
    @Param('sprintId') sprintId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { horas?: number; tarefasPendentes?: number; custoTotal?: number; rankingPosicao?: number },
  ) {
    return this.dashboardService.upsertMetric(sprintId, userId, body)
  }

  @Get('sprints/:sprintId/feedback')
  getFeedbacks(@Param('sprintId') sprintId: string) {
    return this.dashboardService.getFeedbacks(sprintId)
  }

  @Post('sprints/:sprintId/feedback')
  upsertFeedback(
    @Param('sprintId') sprintId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { tarefasRealizadas?: string; dificuldades?: string; qualidade: number; dificuldade: number },
  ) {
    if (body.qualidade == null || body.dificuldade == null) {
      throw new BadRequestException('qualidade e dificuldade são obrigatórios')
    }
    return this.dashboardService.upsertFeedback(sprintId, userId, body)
  }
}
