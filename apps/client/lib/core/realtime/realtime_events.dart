/// Espelha `packages/shared-types/src/index.ts` (`RealtimeEvent`) do backend.
/// Mudar um nome aqui sem mudar lá (ou vice-versa) quebra o protocolo — os
/// dois lados têm que ser atualizados juntos.
class RealtimeEvent {
  const RealtimeEvent._();

  // Cliente → servidor
  static const presenceSet = 'presence:set';
  static const typingStart = 'typing:start';
  static const typingStop = 'typing:stop';

  // Servidor → cliente
  static const presenceUpdate = 'presence:update';
  static const messageCreate = 'message:create';
  static const messageUpdate = 'message:update';
  static const messageDelete = 'message:delete';
  static const memberJoin = 'member:join';
  static const friendRequestCreate = 'friend:request:create';
  static const friendRequestUpdate = 'friend:request:update';
  static const channelCreate = 'channel:create';
  static const channelUpdate = 'channel:update';
  static const channelDelete = 'channel:delete';
  static const categoryCreate = 'category:create';
  static const categoryDelete = 'category:delete';
}
