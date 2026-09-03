import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/realtime/realtime_client.dart';
import '../../../core/realtime/realtime_events.dart';
import '../../../core/realtime/realtime_providers.dart';

/// IDs de usuário digitando neste canal agora. Cada `typing:start` recebido
/// arma um timeout de 6s que remove o usuário sozinho — protege contra um
/// `typing:stop` perdido (app fechado, conexão caiu) deixando o indicador
/// travado para sempre.
final typingUsersProvider =
    NotifierProvider.family<TypingController, Set<String>, String>(TypingController.new);

class TypingController extends FamilyNotifier<Set<String>, String> {
  late final RealtimeClient _realtime;
  final Map<String, Timer> _timers = {};

  String get _channelId => arg;

  @override
  Set<String> build(String arg) {
    _realtime = ref.watch(realtimeClientProvider);
    _realtime.on(RealtimeEvent.typingStart, _onStart);
    _realtime.on(RealtimeEvent.typingStop, _onStop);

    ref.onDispose(() {
      _realtime.off(RealtimeEvent.typingStart, _onStart);
      _realtime.off(RealtimeEvent.typingStop, _onStop);
      for (final timer in _timers.values) {
        timer.cancel();
      }
    });

    return <String>{};
  }

  void _onStart(dynamic data) {
    final map = Map<String, dynamic>.from(data as Map);
    if (map['channelId'] != _channelId) return;
    final userId = map['userId'] as String;

    state = {...state, userId};
    _timers[userId]?.cancel();
    _timers[userId] = Timer(const Duration(seconds: 6), () => _remove(userId));
  }

  void _onStop(dynamic data) {
    final map = Map<String, dynamic>.from(data as Map);
    if (map['channelId'] != _channelId) return;
    _remove(map['userId'] as String);
  }

  void _remove(String userId) {
    _timers.remove(userId)?.cancel();
    if (!state.contains(userId)) return;
    state = state.where((id) => id != userId).toSet();
  }
}
