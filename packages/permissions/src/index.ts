/**
 * Fonte única da verdade das permissões RBAC do Relay.
 *
 * Cada permissão é um bit em um bigint. Cargos (roles) carregam um bitfield;
 * a permissão efetiva de um membro é a soma (OR) dos bitfields dos seus
 * cargos, mais overwrites específicos de canal/categoria.
 *
 * Este pacote é consumido pelo backend (apps/api) e, futuramente, pelo
 * cliente Flutter (via geração de código) e pelo bot-sdk — nunca duplique
 * esta lista em outro lugar.
 */

export const Permission = {
  VIEW_CHANNELS: 1n << 0n,
  MANAGE_CHANNELS: 1n << 1n,
  MANAGE_ROLES: 1n << 2n,
  MANAGE_SERVER: 1n << 3n,
  CREATE_INVITE: 1n << 4n,
  CHANGE_NICKNAME: 1n << 5n,
  MANAGE_NICKNAMES: 1n << 6n,
  KICK_MEMBERS: 1n << 7n,
  BAN_MEMBERS: 1n << 8n,

  SEND_MESSAGES: 1n << 9n,
  MANAGE_MESSAGES: 1n << 10n,
  ATTACH_FILES: 1n << 11n,
  READ_MESSAGE_HISTORY: 1n << 12n,
  MENTION_EVERYONE: 1n << 13n,
  ADD_REACTIONS: 1n << 14n,

  CONNECT: 1n << 15n,
  SPEAK: 1n << 16n,
  VIDEO: 1n << 17n,
  SHARE_SCREEN: 1n << 18n,
  MUTE_MEMBERS: 1n << 19n,
  DEAFEN_MEMBERS: 1n << 20n,
  MOVE_MEMBERS: 1n << 21n,

  MANAGE_WEBHOOKS: 1n << 22n,
  MANAGE_BOTS: 1n << 23n,
  VIEW_AUDIT_LOG: 1n << 24n,

  /**
   * Concede todas as permissões atuais e futuras. Só o dono do servidor
   * deveria ter isso por padrão. Fica no bit 62 (não 63): Postgres BIGINT é
   * um inteiro assinado de 64 bits, e 1n<<63n já estoura o valor máximo
   * representável (2^63 - 1), quebrando a persistência do bitfield.
   */
  ADMINISTRATOR: 1n << 62n,
} as const;

export type PermissionName = keyof typeof Permission;

/** Permissões padrão do cargo @everyone criado junto com todo novo servidor. */
export const DEFAULT_EVERYONE_PERMISSIONS: bigint =
  Permission.VIEW_CHANNELS |
  Permission.CREATE_INVITE |
  Permission.CHANGE_NICKNAME |
  Permission.SEND_MESSAGES |
  Permission.ATTACH_FILES |
  Permission.READ_MESSAGE_HISTORY |
  Permission.ADD_REACTIONS |
  Permission.CONNECT |
  Permission.SPEAK |
  Permission.VIDEO |
  Permission.SHARE_SCREEN;

/** Todas as permissões — usado para o cargo/dono com controle total do servidor. */
export const ALL_PERMISSIONS: bigint = Object.values(Permission).reduce(
  (acc, bit) => acc | bit,
  0n,
);

export function hasPermission(bitfield: bigint, permission: bigint): boolean {
  if ((bitfield & Permission.ADMINISTRATOR) === Permission.ADMINISTRATOR) {
    return true;
  }
  return (bitfield & permission) === permission;
}

export function addPermission(bitfield: bigint, permission: bigint): bigint {
  return bitfield | permission;
}

export function removePermission(bitfield: bigint, permission: bigint): bigint {
  return bitfield & ~permission;
}

/**
 * Aplica um overwrite (allow/deny) de canal ou categoria sobre um bitfield base.
 * Deny é aplicado depois de allow, então deny sempre vence em caso de conflito.
 */
export function applyOverwrite(
  base: bigint,
  allow: bigint,
  deny: bigint,
): bigint {
  return (base | allow) & ~deny;
}

export function permissionsToBitfield(names: PermissionName[]): bigint {
  return names.reduce((acc, name) => acc | Permission[name], 0n);
}

export function bitfieldToPermissions(bitfield: bigint): PermissionName[] {
  return (Object.keys(Permission) as PermissionName[]).filter((name) =>
    hasPermission(bitfield, Permission[name]),
  );
}
