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
  ref.onDispose(() {
    for (final event in structureEvents) {
      realtime.off(event, handleStructureChange);
    }
  });

  return repo.getDetail(serverId);
});
