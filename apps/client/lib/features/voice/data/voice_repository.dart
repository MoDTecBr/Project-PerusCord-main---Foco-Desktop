import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/network_providers.dart';
import '../domain/voice_token.dart';

final voiceRepositoryProvider = Provider<VoiceRepository>((ref) {
  return VoiceRepository(ref.watch(apiClientProvider).dio);
});

class VoiceRepository {
  VoiceRepository(this._dio);

  final Dio _dio;

  Future<VoiceToken> mintToken(String channelId) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/channels/$channelId/voice-token');
      return VoiceToken.fromJson(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
