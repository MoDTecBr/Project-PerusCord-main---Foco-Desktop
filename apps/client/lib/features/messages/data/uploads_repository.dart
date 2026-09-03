import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/network_providers.dart';
import '../domain/message_models.dart';

final uploadsRepositoryProvider = Provider<UploadsRepository>((ref) {
  return UploadsRepository(ref.watch(apiClientProvider).dio);
});

class UploadsRepository {
  UploadsRepository(this._dio);

  final Dio _dio;

  Future<MessageAttachment> uploadImage({
    required List<int> bytes,
    required String filename,
    required String mimeType,
  }) async {
    try {
      final form = FormData.fromMap({
        'file': MultipartFile.fromBytes(bytes, filename: filename, contentType: DioMediaType.parse(mimeType)),
      });
      final res = await _dio.post<Map<String, dynamic>>('/uploads', data: form);
      return MessageAttachment.fromJson(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
