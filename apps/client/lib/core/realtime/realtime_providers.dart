import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'realtime_client.dart';

/// Uma única conexão de socket por sessão do app — conectada/desconectada
/// externamente conforme o `AuthState` muda (ver `main.dart`).
final realtimeClientProvider = Provider<RealtimeClient>((ref) {
  final client = RealtimeClient();
  ref.onDispose(client.disconnect);
  return client;
});
