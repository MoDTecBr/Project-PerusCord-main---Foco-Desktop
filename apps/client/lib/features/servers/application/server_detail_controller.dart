import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/realtime/realtime_events.dart';
import '../../../core/realtime/realtime_providers.dart';
import '../data/servers_repository.dart';
import '../domain/server_detail_models.dart';

/// Estrutura do servidor (canais, categorias, membros) — refeita via
/// WebSocket quando canais/categorias mudam em qualquer cliente (o próprio
/// criador incluído), pra sidebar nunca depender de um F5 pra aparecer.
final serverDetailProvider =
    FutureProvider.autoDispose.family<ServerDetail, String>((ref, serverId) async {
  final repo = ref.watch(serversRepositoryProvider);
  final realtime = ref.watch(realtimeClientProvider);

  void handleStructureChange(dynamic data) {
    final map = Map<String, dynamic>.from(data as Map);
    if (map['serverId'] != serverId) return;
    ref.invalidateSelf();
  }

  const structureEvents = [
    RealtimeEvent.channelCreate,
    RealtimeEvent.channelUpdate,
    RealtimeEvent.channelDelete,
    RealtimeEvent.categoryCreate,
    RealtimeEvent.categoryDelete,
  ];
  for (final event in structureEvents) {
    realtime.on(event, handleStructureChange);
  }

  // Um membro ficou online/offline — o payload não carrega `serverId` (o
  // backend só emite pra quem já importa: membros do mesmo servidor), então
  // qualquer evento recebido aqui já é relevante pra este servidor.
  void handlePresenceChange(dynamic _) => ref.invalidateSelf();
  realtime.on(RealtimeEvent.presenceUpdate, handlePresenceChange);

  ref.onDispose(() {
    for (final event in structureEvents) {
      realtime.off(event, handleStructureChange);
    }
    realtime.off(RealtimeEvent.presenceUpdate, handlePresenceChange);
  });

  return repo.getDetail(serverId);
});
