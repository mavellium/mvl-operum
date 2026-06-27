import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common'
import { ZodError } from 'zod'

type MinimalResponse = {
  status: (code: number) => MinimalResponse
  json: (body: unknown) => void
}

@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  catch(exception: ZodError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<MinimalResponse>()
    const message = exception.issues[0]?.message ?? 'Dados inválidos'
    res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: message })
  }
}
