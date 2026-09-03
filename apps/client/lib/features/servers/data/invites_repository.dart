import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/network_providers.dart';

final invitesRepositoryProvider = Provider<InvitesRepository>((ref) {
  return InvitesRepository(ref.watch(apiClientProvider).dio);
});

class InvitesRepository {
  InvitesRepository(this._dio);

  final Dio _dio;

  /// Cria um convite e retorna o código (ex: "aB3xY9Qz").
  Future<String> createInvite(String serverId, {int? maxUses, int? expiresInSeconds}) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/servers/$serverId/invites', data: {
        if (maxUses != null) 'maxUses': maxUses,
        if (expiresInSeconds != null) 'expiresInSeconds': expiresInSeconds,
      });
      return res.data!['code'] as String;
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  /// Resgata um convite e retorna o id do servidor que o usuário acabou de entrar.
  Future<String> joinByCode(String code) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/invites/$code/join');
      return res.data!['id'] as String;
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
