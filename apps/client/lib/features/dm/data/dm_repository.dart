import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/network_providers.dart';
import '../domain/dm_models.dart';

final dmRepositoryProvider = Provider<DmRepository>((ref) {
  return DmRepository(ref.watch(apiClientProvider).dio);
});

class DmRepository {
  DmRepository(this._dio);

  final Dio _dio;

  Future<List<DmConversation>> list() async {
    try {
      final res = await _dio.get<List<dynamic>>('/dm');
      return res.data!.map((e) => DmConversation.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  /// Abre (ou reaproveita) a DM com um amigo pelo username.
  Future<DmConversation> openWith(String username) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/dm/$username');
      // O backend retorna o canal cru (sem `participant`) — a tela já sabe
      // com quem está falando, então completa o campo localmente.
      return DmConversation(channelId: res.data!['id'] as String, participant: null);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
