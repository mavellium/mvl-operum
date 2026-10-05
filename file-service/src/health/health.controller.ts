import { Controller, Get, Header, Headers, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common'
import { metrics } from '../telemetry'
import { Public } from '../decorators/public.decorator'
import { databaseReady, httpReady, redisReady } from './probes'

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() { return { status: 'ok' } }

  @Public()
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4')
  metrics(@Headers('authorization') authorization: string) {
    if (!process.env.INTERNAL_API_KEY || authorization !== `Bearer ${process.env.INTERNAL_API_KEY}`) throw new UnauthorizedException()
    return metrics()
  }

  @Public()
  @Get('ready')
  async ready() {
    const checks = await Promise.all([databaseReady(), httpReady(`${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT ?? 'minio'}:${process.env.MINIO_PORT ?? 9000}/minio/health/ready`)])
    if (checks.some(ok => !ok)) throw new ServiceUnavailableException('Not ready')
    return { status: 'ready' }
  }
}
