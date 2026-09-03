import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/network_providers.dart';
import '../domain/server_detail_models.dart';
import '../domain/server_models.dart';

final serversRepositoryProvider = Provider<ServersRepository>((ref) {
  return ServersRepository(ref.watch(apiClientProvider).dio);
});

class ServersRepository {
  ServersRepository(this._dio);

  final Dio _dio;

  Future<List<RelayServer>> listMine() async {
    try {
      final res = await _dio.get<List<dynamic>>('/servers');
      return res.data!.map((e) => RelayServer.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<ServerDetail> getDetail(String serverId) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/servers/$serverId');
      return ServerDetail.fromJson(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<RelayServer> create({required String name, String? description}) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/servers', data: {
        'name': name,
        if (description != null && description.isNotEmpty) 'description': description,
      });
      return RelayServer.fromJson(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
