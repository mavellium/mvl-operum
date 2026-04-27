"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const internal_auth_guard_1 = require("./guards/internal-auth.guard");
if (!process.env.INTERNAL_API_KEY) {
    throw new Error('FATAL: INTERNAL_API_KEY is not set.');
}
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true }));
    app.useGlobalGuards(new internal_auth_guard_1.InternalAuthGuard(app.get(core_1.Reflector)));
    await app.listen(process.env.PORT ?? 4005);
}
bootstrap();
//# sourceMappingURL=main.js.map