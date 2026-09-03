import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/** Deriva uma chave de 32 bytes a partir do secret configurado (não armazenar a chave crua). */
function loadEncryptionKey(): Buffer {
  const secret = process.env.MFA_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error(
      'MFA_ENCRYPTION_KEY ausente ou curta demais (mínimo 32 caracteres). Gere com: openssl rand -base64 32',
    );
  }
  return createHash('sha256').update(secret).digest();
}

/** Criptografa um segredo (ex: TOTP secret) antes de persistir — formato: iv:tag:ciphertext, tudo em base64url. */
export function encryptSecret(plaintext: string): string {
  const key = loadEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((buf) => buf.toString('base64url')).join(':');
}

export function decryptSecret(payload: string): string {
  const key = loadEncryptionKey();
  const [ivB64, tagB64, ciphertextB64] = payload.split(':');
  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const ciphertext = Buffer.from(ciphertextB64, 'base64url');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/** Token opaco de alta entropia para refresh tokens — nunca um JWT (não precisa ser auto-descritivo). */
export function generateOpaqueToken(): string {
  return randomBytes(48).toString('base64url');
}

/**
 * Refresh tokens já são segredos de alta entropia gerados por nós, então um
 * hash rápido (SHA-256) é apropriado para buscá-los no banco — ao contrário
 * de senhas de usuário, não há necessidade (nem seria viável em cada refresh)
 * de um hash lento como Argon2id aqui.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const n = randomInt(0, 1_000_000_000);
    return n.toString(36).padStart(6, '0');
  });
}
