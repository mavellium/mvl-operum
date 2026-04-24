import 'dotenv/config'
import { NestFactory, Reflector } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import { InternalAuthGuard } from './guards/internal-auth.guard'

if (!process.env.INTERNAL_API_KEY) {
  throw new Error('FATAL: INTERNAL_API_KEY is not set.')
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
  app.useGlobalGuards(new InternalAuthGuard(app.get(Reflector)))
  await app.listen(process.env.PORT ?? 4005)
}
bootstrap()
