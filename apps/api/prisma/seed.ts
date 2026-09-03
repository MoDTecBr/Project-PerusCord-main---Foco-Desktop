/**
 * Seed de conveniência para desenvolvimento local: cria um usuário e um
 * servidor de exemplo se ainda não existirem. Nunca rode isso em produção.
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { ALL_PERMISSIONS, DEFAULT_EVERYONE_PERMISSIONS } from '@relay/permissions';

const prisma = new PrismaClient();

async function main() {
  const email = 'dev@relay.local';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Seed já aplicado — usuário dev@relay.local já existe.');
    return;
  }

  const passwordHash = await argon2.hash('senha-de-desenvolvimento-123', {
    type: argon2.argon2id,
  });

  // Tudo em uma transação: uma falha no meio do caminho não pode deixar um
  // usuário órfão sem servidor (foi exatamente isso que aconteceu antes desta
  // versão, quebrando a checagem de idempotência acima).
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, username: 'dev', displayName: 'Dev Local', passwordHash },
    });

    const server = await tx.server.create({
      data: { name: 'Servidor de Testes', ownerId: user.id },
    });

    const everyoneRole = await tx.role.create({
      data: {
        serverId: server.id,
        name: '@everyone',
        permissions: DEFAULT_EVERYONE_PERMISSIONS,
        position: 0,
        isEveryone: true,
      },
    });
    const ownerRole = await tx.role.create({
      data: { serverId: server.id, name: 'Dono', permissions: ALL_PERMISSIONS, position: 1 },
    });

    const member = await tx.member.create({ data: { serverId: server.id, userId: user.id } });
    await tx.memberRole.createMany({
      data: [
        { memberId: member.id, roleId: everyoneRole.id },
        { memberId: member.id, roleId: ownerRole.id },
      ],
    });

    const category = await tx.category.create({
      data: { serverId: server.id, name: 'Geral', position: 0 },
    });
    await tx.channel.create({
      data: { serverId: server.id, categoryId: category.id, name: 'geral', type: 'TEXT', position: 0 },
    });
  });

  console.log(`Seed criado: login com ${email} / senha-de-desenvolvimento-123`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
