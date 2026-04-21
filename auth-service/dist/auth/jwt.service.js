"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtService = void 0;
const common_1 = require("@nestjs/common");
const jose_1 = require("jose");
const uuid_1 = require("uuid");
function normalizePem(raw) {
    return raw.replace(/\\n/g, '\n');
}
const SESSION_DURATION = 7 * 24 * 60 * 60;
let JwtService = class JwtService {
    constructor() {
        this.privateKeyPem = process.env.JWT_PRIVATE_KEY
            ? normalizePem(process.env.JWT_PRIVATE_KEY)
            : null;
        this.publicKeyPem = process.env.JWT_PUBLIC_KEY
            ? normalizePem(process.env.JWT_PUBLIC_KEY)
            : null;
    }
    async sign(payload) {
        const jti = (0, uuid_1.v4)();
        if (this.privateKeyPem) {
            const privateKey = await (0, jose_1.importPKCS8)(this.privateKeyPem, 'RS256');
            const token = await new jose_1.SignJWT({ ...payload, jti })
                .setProtectedHeader({ alg: 'RS256' })
                .setIssuedAt()
                .setExpirationTime(`${SESSION_DURATION}s`)
                .setJti(jti)
                .sign(privateKey);
            return { token, jti };
        }
        const secret = process.env.SESSION_SECRET;
        if (!secret)
            throw new Error('FATAL: Neither JWT_PRIVATE_KEY nor SESSION_SECRET is set.');
        const hs256Secret = new TextEncoder().encode(secret);
        const token = await new jose_1.SignJWT({ ...payload, jti })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime(`${SESSION_DURATION}s`)
            .sign(hs256Secret);
        return { token, jti };
    }
    async verify(token) {
        if (this.publicKeyPem) {
            try {
                const publicKey = await (0, jose_1.importSPKI)(this.publicKeyPem, 'RS256');
                const { payload } = await (0, jose_1.jwtVerify)(token, publicKey, { algorithms: ['RS256'] });
                return payload;
            }
            catch {
            }
        }
        const secret = process.env.SESSION_SECRET;
        if (secret) {
            try {
                const hs256Secret = new TextEncoder().encode(secret);
                const { payload } = await (0, jose_1.jwtVerify)(token, hs256Secret, { algorithms: ['HS256'] });
                return payload;
            }
            catch {
                return null;
            }
        }
        return null;
    }
};
exports.JwtService = JwtService;
exports.JwtService = JwtService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], JwtService);
//# sourceMappingURL=jwt.service.js.map