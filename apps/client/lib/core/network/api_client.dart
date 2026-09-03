import 'dart:async';

import 'package:dio/dio.dart';

import '../config/env.dart';

/// Rotas que nunca devem disparar o fluxo de refresh (evita loop infinito:
/// um 401 em `/auth/login` é só senha errada, não sessão expirada).
const _authExemptPaths = ['/auth/login', '/auth/register', '/auth/refresh'];

/// Cliente HTTP único do app. Injeta o access token em toda requisição e,
/// num 401, tenta renovar a sessão via refresh token uma única vez antes de
/// desistir — concorrente com outras requisições que também levaram 401 ao
/// mesmo tempo (todas esperam o mesmo refresh em vez de disparar o próprio).
class ApiClient {
  ApiClient({
    required Future<String?> Function() getAccessToken,
    required Future<bool> Function() refreshSession,
    required void Function() onSessionExpired,
  })  : _getAccessToken = getAccessToken,
        _refreshSession = refreshSession,
        _onSessionExpired = onSessionExpired {
    dio = Dio(BaseOptions(baseUrl: Env.apiBaseUrl, connectTimeout: const Duration(seconds: 15)));
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _getAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final path = error.requestOptions.path;
          final isAuthExempt = _authExemptPaths.any(path.startsWith);
          final alreadyRetried = error.requestOptions.extra['retried'] == true;

          if (error.response?.statusCode == 401 && !isAuthExempt && !alreadyRetried) {
            final refreshed = await _refreshOnce();
            if (refreshed) {
              try {
                final retryResponse = await _retry(error.requestOptions);
                return handler.resolve(retryResponse);
              } on DioException catch (retryError) {
                return handler.next(retryError);
              }
            }
            _onSessionExpired();
          }
          handler.next(error);
        },
      ),
    );
  }

  late final Dio dio;
  final Future<String?> Function() _getAccessToken;
  final Future<bool> Function() _refreshSession;
  final void Function() _onSessionExpired;

  Completer<bool>? _refreshing;

  Future<bool> _refreshOnce() {
    final inFlight = _refreshing;
    if (inFlight != null) return inFlight.future;

    final completer = Completer<bool>();
    _refreshing = completer;
    _refreshSession().then((ok) {
      completer.complete(ok);
      _refreshing = null;
    }).catchError((_) {
      completer.complete(false);
      _refreshing = null;
    });
    return completer.future;
  }

  Future<Response<dynamic>> _retry(RequestOptions requestOptions) async {
    final token = await _getAccessToken();
    final headers = Map<String, dynamic>.from(requestOptions.headers);
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    // Marca a flag na requisição NOVA (via `extra`), não na antiga — se
    // fosse na antiga, o retry criaria um RequestOptions interno próprio no
    // Dio e a flag nunca seria vista num eventual 401 do retry, arriscando
    // um loop (refresh "funciona" mas o novo token ainda assim é rejeitado).
    final options = Options(
      method: requestOptions.method,
      headers: headers,
      extra: {...requestOptions.extra, 'retried': true},
    );
    return dio.request<dynamic>(
      requestOptions.path,
      data: requestOptions.data,
      queryParameters: requestOptions.queryParameters,
      options: options,
    );
  }
}
