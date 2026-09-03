/**
 * Contratos compartilhados entre backend (apps/api), gateway realtime,
 * cliente Flutter e bot-sdk. Mudar um valor aqui é uma mudança de protocolo —
 * trate como API pública entre os pacotes do monorepo.
 */

export enum ChannelType {
  TEXT = 'TEXT',
  VOICE = 'VOICE',
  VIDEO = 'VIDEO',
  DM = 'DM',
}

export enum PresenceStatus {
  ONLINE = 'ONLINE',
  IDLE = 'IDLE',
  DO_NOT_DISTURB = 'DO_NOT_DISTURB',
  OFFLINE = 'OFFLINE',
}

export enum AuditLogAction {
  MEMBER_KICK = 'MEMBER_KICK',
  MEMBER_BAN = 'MEMBER_BAN',
  MEMBER_ROLE_UPDATE = 'MEMBER_ROLE_UPDATE',
  ROLE_CREATE = 'ROLE_CREATE',
  ROLE_UPDATE = 'ROLE_UPDATE',
  ROLE_DELETE = 'ROLE_DELETE',
  CHANNEL_CREATE = 'CHANNEL_CREATE',
  CHANNEL_UPDATE = 'CHANNEL_UPDATE',
  CHANNEL_DELETE = 'CHANNEL_DELETE',
  CATEGORY_CREATE = 'CATEGORY_CREATE',
  CATEGORY_DELETE = 'CATEGORY_DELETE',
  INVITE_CREATE = 'INVITE_CREATE',
  INVITE_DELETE = 'INVITE_DELETE',
  SERVER_UPDATE = 'SERVER_UPDATE',
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  /** Segundos até o access token expirar. */
  expiresIn: number;
}

/**
 * Nomes de evento do gateway WebSocket (Fase 3 — Realtime & Presença).
 * Cliente conecta com `auth: { token: <access token> }` no handshake do
 * Socket.IO. `server:*` chega em quem está conectado à room `server:{id}`
 * (todo membro de um servidor); `user:*` chega na room pessoal `user:{id}`
 * (DMs, amizades, presença).
 */
export const RealtimeEvent = {
  // Cliente → servidor
  PRESENCE_SET: 'presence:set',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',

  // Servidor → cliente
  PRESENCE_UPDATE: 'presence:update',
  MESSAGE_CREATE: 'message:create',
  MESSAGE_UPDATE: 'message:update',
  MESSAGE_DELETE: 'message:delete',
  MEMBER_JOIN: 'member:join',
  FRIEND_REQUEST_CREATE: 'friend:request:create',
  FRIEND_REQUEST_UPDATE: 'friend:request:update',
  CHANNEL_CREATE: 'channel:create',
  CHANNEL_UPDATE: 'channel:update',
  CHANNEL_DELETE: 'channel:delete',
  CATEGORY_CREATE: 'category:create',
  CATEGORY_DELETE: 'category:delete',
} as const;

export interface PresenceUpdatePayload {
  userId: string;
  status: PresenceStatus;
}

export interface TypingPayload {
  channelId: string;
  userId: string;
}
