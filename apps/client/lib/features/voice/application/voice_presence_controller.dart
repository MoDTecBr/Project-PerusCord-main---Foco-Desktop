import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/voice_presence_repository.dart';
import '../domain/voice_presence.dart';

/// Repolla a cada 4s enquanto alguém estiver olhando (autoDispose cuida de
/// parar quando ninguém mais assiste, ex: saindo do servidor). Não é
/// realtime de verdade (isso pediria webhook do LiveKit para o backend),
/// mas já mostra quem está na call sem precisar entrar para descobrir.
final voicePresenceProvider = StreamProvider.autoDispose
    .family<Map<String, List<VoicePresenceParticipant>>, String>((ref, serverId) async* {
  final repo = ref.watch(voicePresenceRepositoryProvider);
  while (true) {
    try {
      yield await repo.getPresence(serverId);
    } catch (_) {
      yield {};
    }
    await Future.delayed(const Duration(seconds: 4));
  }
});
