/**
 * Troca a senha de um usuário direto no banco — não existe endpoint na API
 * pra isso (só o próprio usuário logado troca a senha dele mesmo, e essa
 * tela ainda não existe). Uso:
 *
 *   npm run password:set -- --email=alguem@exemplo.com --password="SenhaNova123"
 *
 * (ou --username= no lugar de --email=). A senha é sempre re-hasheada com
 * Argon2id, do mesmo jeito que o registro/login normal fazem.
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

function parseArgs(): { email?: string; username?: string; password: string } {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, ...rest] = arg.replace(/^--/, '').split('=');
      return [key, rest.join('=')];
    }),
  );

  if (!args.password) {
    throw new Error(
      'Faltou --password="NovaSenha". Exemplo:\n' +
        '  npm run password:set -- --email=alguem@exemplo.com --password="SenhaNova123"',
    );
  }
  if (!args.email && !args.username) {
    throw new Error('Informe --email=... ou --username=... pra identificar o usuário.');
  }
  return { email: args.email, username: args.username, password: args.password };
}

async function main() {
  const { email, username, password } = parseArgs();

  const user = await prisma.user.findFirst({
    where: email ? { email } : { username },
  });
  if (!user) {
    throw new Error(`Nenhum usuário encontrado com ${email ? `email ${email}` : `username ${username}`}.`);
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  console.log(`Senha atualizada para ${user.username} (${user.email}).`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
