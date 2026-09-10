"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
exports.generateOpaqueToken = generateOpaqueToken;
exports.hashToken = hashToken;
exports.generateBackupCodes = generateBackupCodes;
const crypto_1 = require("crypto");
const ALGORITHM = 'aes-256-gcm';
function loadEncryptionKey() {
    const secret = process.env.MFA_ENCRYPTION_KEY;
    if (!secret || secret.length < 32) {
        throw new Error('MFA_ENCRYPTION_KEY ausente ou curta demais (mínimo 32 caracteres). Gere com: openssl rand -base64 32');
    }
    return (0, crypto_1.createHash)('sha256').update(secret).digest();
}
function encryptSecret(plaintext) {
    const key = loadEncryptionKey();
    const iv = (0, crypto_1.randomBytes)(12);
    const cipher = (0, crypto_1.createCipheriv)(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv, tag, ciphertext].map((buf) => buf.toString('base64url')).join(':');
}
function decryptSecret(payload) {
    const key = loadEncryptionKey();
    const [ivB64, tagB64, ciphertextB64] = payload.split(':');
    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const ciphertext = Buffer.from(ciphertextB64, 'base64url');
    const decipher = (0, crypto_1.createDecipheriv)(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
function generateOpaqueToken() {
    return (0, crypto_1.randomBytes)(48).toString('base64url');
}
function hashToken(token) {
    return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
}
function generateBackupCodes(count = 8) {
    return Array.from({ length: count }, () => {
        const n = (0, crypto_1.randomInt)(0, 1_000_000_000);
        return n.toString(36).padStart(6, '0');
    });
}
//# sourceMappingURL=crypto.util.js.map