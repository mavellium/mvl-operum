import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'

/**
 * Bloqueia rotas de sessão/conta para Personal Access Tokens.
 *
 * x-auth-type só é 'pat' quando o api-gateway autenticou a requisição por
 * introspecção de PAT (o gateway sempre descarta o valor enviado pelo cliente).
 * Sem este guard um PAT com escopo write poderia, por exemplo, chamar
 * /auth/switch-tenant e obter um JWT de sessão completo em outro tenant.
 * O gateway já barra essas rotas para PAT (allowlist); isto é defesa em profundidade.
 */
@Injectable()
export class NoPatGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>()
    if (req.headers['x-auth-type'] === 'pat') {
      throw new ForbiddenException('Operação não permitida com Personal Access Token')
    }
    return true
  }
}
