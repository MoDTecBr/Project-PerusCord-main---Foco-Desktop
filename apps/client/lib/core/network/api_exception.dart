import 'package:dio/dio.dart';

/// Erro da API já traduzido para algo exibível — sempre prefira `messages`
/// (uma lista, já que o backend retorna múltiplos erros de validação juntos)
/// a tentar interpretar o `DioException` cru na UI.
class ApiException implements Exception {
  ApiException({required this.statusCode, required this.messages});

  final int? statusCode;
  final List<String> messages;

  String get message => messages.join('\n');

  factory ApiException.fromDioException(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['message'] != null) {
      final raw = data['message'];
      final messages = raw is List ? raw.map((m) => m.toString()).toList() : [raw.toString()];
      return ApiException(statusCode: e.response?.statusCode, messages: messages);
    }
    return ApiException(
      statusCode: e.response?.statusCode,
      messages: [e.message ?? 'Falha de conexão com o servidor.'],
    );
  }

  @override
  String toString() => message;
}
