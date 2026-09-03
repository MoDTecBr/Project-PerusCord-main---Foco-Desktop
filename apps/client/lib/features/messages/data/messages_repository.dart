import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/network_providers.dart';
import '../domain/message_models.dart';

final messagesRepositoryProvider = Provider<MessagesRepository>((ref) {
  return MessagesRepository(ref.watch(apiClientProvider).dio);
});

class MessagesRepository {
  MessagesRepository(this._dio);

  final Dio _dio;

  /// Retorna as mensagens mais recentes primeiro (mesma ordem do backend).
  Future<List<RelayMessage>> list(String channelId, {String? before}) async {
    try {
      final res = await _dio.get<List<dynamic>>(
        '/channels/$channelId/messages',
        queryParameters: {if (before != null) 'before': before, 'limit': 50},
      );
      return res.data!.map((e) => RelayMessage.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<RelayMessage> send(
    String channelId, {
    String? content,
    String? replyToId,
    List<MessageAttachment>? attachments,
  }) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/channels/$channelId/messages', data: {
        if (content != null && content.isNotEmpty) 'content': content,
        if (replyToId != null) 'replyToId': replyToId,
        if (attachments != null && attachments.isNotEmpty)
          'attachments': attachments.map((a) => a.toJson()).toList(),
      });
      return RelayMessage.fromJson(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<RelayMessage> update(String messageId, String content) async {
    try {
      final res = await _dio.patch<Map<String, dynamic>>('/messages/$messageId', data: {
        'content': content,
      });
      return RelayMessage.fromJson(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<void> delete(String messageId) async {
    try {
      await _dio.delete<void>('/messages/$messageId');
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
