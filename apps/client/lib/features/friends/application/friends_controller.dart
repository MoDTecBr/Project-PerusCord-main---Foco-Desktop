import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/realtime/realtime_events.dart';
import '../../../core/realtime/realtime_providers.dart';
import '../data/friends_repository.dart';
import '../domain/friend_models.dart';

// Tipos explícitos nos três providers abaixo: o binder invalida as duas
// listas e as listas assistem o binder, um ciclo de referência que o
// analisador não consegue inferir sozinho sem uma anotação em pelo menos
// um lado (senão: "top_level_cycle").
final AutoDisposeFutureProvider<List<FriendUser>> friendsListProvider =
    FutureProvider.autoDispose<List<FriendUser>>((ref) async {
  ref.watch(_friendsRealtimeBinderProvider);
  return ref.watch(friendsRepositoryProvider).listFriends();
});

final AutoDisposeFutureProvider<PendingFriendRequests> pendingRequestsProvider =
    FutureProvider.autoDispose<PendingFriendRequests>((ref) async {
  ref.watch(_friendsRealtimeBinderProvider);
  return ref.watch(friendsRepositoryProvider).listPending();
});

/// Assiste `friend:request:create`/`update` e invalida as duas listas acima
/// para que elas se recarreguem sozinhas — sem isso, aceitar um pedido em um
/// dispositivo não atualizaria a tela de amigos aberta em outro.
final AutoDisposeProvider<void> _friendsRealtimeBinderProvider = Provider.autoDispose<void>((ref) {
  final realtime = ref.watch(realtimeClientProvider);

  void handler(dynamic _) {
    ref.invalidate(friendsListProvider);
    ref.invalidate(pendingRequestsProvider);
  }

  realtime.on(RealtimeEvent.friendRequestCreate, handler);
  realtime.on(RealtimeEvent.friendRequestUpdate, handler);
  ref.onDispose(() {
    realtime.off(RealtimeEvent.friendRequestCreate, handler);
    realtime.off(RealtimeEvent.friendRequestUpdate, handler);
  });
});
