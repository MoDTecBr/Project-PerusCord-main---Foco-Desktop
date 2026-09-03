import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/network_providers.dart';

final channelsRepositoryProvider = Provider<ChannelsRepository>((ref) {
  return ChannelsRepository(ref.watch(apiClientProvider).dio);
});

class ChannelsRepository {
  ChannelsRepository(this._dio);

  final Dio _dio;

  Future<void> createChannel(
    String serverId, {
    required String name,
    required String type,
    String? categoryId,
  }) async {
    try {
      await _dio.post<void>('/servers/$serverId/channels', data: {
        'name': name,
        'type': type,
        if (categoryId != null) 'categoryId': categoryId,
      });
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<void> createCategory(String serverId, String name) async {
    try {
      await _dio.post<void>('/servers/$serverId/categories', data: {'name': name});
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
