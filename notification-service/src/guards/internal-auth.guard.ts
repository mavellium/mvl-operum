import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'

@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>()
    const key = process.env.INTERNAL_API_KEY
    if (!key) return false
    return req.headers['x-internal-api-key'] === key
  }
}
