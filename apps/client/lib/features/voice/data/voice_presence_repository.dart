import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/network_providers.dart';
import '../domain/voice_presence.dart';

final voicePresenceRepositoryProvider = Provider<VoicePresenceRepository>((ref) {
  return VoicePresenceRepository(ref.watch(apiClientProvider).dio);
});

class VoicePresenceRepository {
  VoicePresenceRepository(this._dio);

  final Dio _dio;

  /// `{ channelId: [participantes] }` — só canais com alguém dentro aparecem
  /// com lista não vazia; o resto vem `[]`.
  Future<Map<String, List<VoicePresenceParticipant>>> getPresence(String serverId) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/servers/$serverId/voice-presence');
      return res.data!.map(
        (channelId, participants) => MapEntry(
          channelId,
          (participants as List<dynamic>)
              .map((p) => VoicePresenceParticipant.fromJson(p as Map<String, dynamic>))
              .toList(),
        ),
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
