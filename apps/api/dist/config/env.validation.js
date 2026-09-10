"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = validateEnv;
const REQUIRED_VARS = ['DATABASE_URL', 'REDIS_URL', 'JWT_ACCESS_SECRET'];
function validateEnv(env) {
    const missing = REQUIRED_VARS.filter((key) => !env[key]);
    if (missing.length > 0) {
        throw new Error(`Configuração inválida — variáveis de ambiente ausentes: ${missing.join(', ')}. Copie .env.example para .env e preencha os valores.`);
    }
    const accessSecret = String(env.JWT_ACCESS_SECRET ?? '');
    if (accessSecret.length < 32) {
        throw new Error('JWT_ACCESS_SECRET precisa ter pelo menos 32 caracteres. Gere um com: openssl rand -base64 48');
    }
    return env;
}
//# sourceMappingURL=env.validation.js.map