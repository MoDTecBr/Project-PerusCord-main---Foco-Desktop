import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/realtime/realtime_events.dart';
import '../../../core/realtime/realtime_providers.dart';
import '../data/dm_repository.dart';
import '../domain/dm_models.dart';

final dmConversationsProvider = FutureProvider.autoDispose<List<DmConversation>>((ref) async {
  ref.watch(_dmRealtimeBinderProvider);
  return ref.watch(dmRepositoryProvider).list();
});

/// Assiste `presence:update` pra recarregar a lista de conversas quando o
/// amigo do outro lado de uma DM fica online/offline (mesmo padrão do
/// `_friendsRealtimeBinderProvider` em friends_controller.dart).
final AutoDisposeProvider<void> _dmRealtimeBinderProvider = Provider.autoDispose<void>((ref) {
  final realtime = ref.watch(realtimeClientProvider);

  void handler(dynamic _) => ref.invalidate(dmConversationsProvider);

  realtime.on(RealtimeEvent.presenceUpdate, handler);
  ref.onDispose(() => realtime.off(RealtimeEvent.presenceUpdate, handler));
});
