import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/network_providers.dart';
import '../domain/sticker_models.dart';

final stickersRepositoryProvider = Provider<StickersRepository>((ref) {
  return StickersRepository(ref.watch(apiClientProvider).dio);
});

class StickersRepository {
  StickersRepository(this._dio);

  final Dio _dio;

  Future<List<Sticker>> list() async {
    try {
      final res = await _dio.get<List<dynamic>>('/stickers');
      return res.data!.map((e) => Sticker.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  /// [url]/[mimeType]/[size] vêm do retorno de `/uploads` — a figurinha só
  /// referencia um arquivo já hospedado, não faz upload de novo.
  Future<Sticker> create({
    required String url,
    required String mimeType,
    required int size,
    String? name,
  }) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/stickers', data: {
        'url': url,
        'mimeType': mimeType,
        'size': size,
        if (name != null) 'name': name,
      });
      return Sticker.fromJson(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<void> remove(String stickerId) async {
    try {
      await _dio.delete<void>('/stickers/$stickerId');
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
