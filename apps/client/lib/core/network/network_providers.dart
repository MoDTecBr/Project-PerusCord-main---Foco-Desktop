import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/env.dart';
import 'access_token_holder.dart';
import 'api_client.dart';
import 'token_storage.dart';

/// Dio "cru", sem interceptor de auth — usado só para register/login/refresh,
/// que são públicos no backend e não podem depender de já ter um token.
final plainDioProvider = Provider<Dio>((ref) {
  return Dio(BaseOptions(baseUrl: Env.apiBaseUrl, connectTimeout: const Duration(seconds: 15)));
});

final accessTokenHolderProvider = Provider<AccessTokenHolder>((ref) => AccessTokenHolder());

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

/// Callback de refresh injetado no `ApiClient` — fica de fora do próprio
/// client para não criar uma dependência circular com o `AuthController`.
/// O `AuthController` sobrescreve isso na inicialização (`bootstrap`).
class RefreshSessionCallback {
  Future<bool> Function() call = () async => false;
}

final refreshSessionCallbackProvider = Provider<RefreshSessionCallback>((ref) {
  return RefreshSessionCallback();
});

/// Callback chamado quando o refresh falha de vez — o `AuthController`
/// sobrescreve para forçar o logout local.
class SessionExpiredCallback {
  void Function() call = () {};
}

final sessionExpiredCallbackProvider = Provider<SessionExpiredCallback>((ref) {
  return SessionExpiredCallback();
});

final apiClientProvider = Provider<ApiClient>((ref) {
  final holder = ref.watch(accessTokenHolderProvider);
  final refreshCallback = ref.watch(refreshSessionCallbackProvider);
  final expiredCallback = ref.watch(sessionExpiredCallbackProvider);

  return ApiClient(
    getAccessToken: () async => holder.current,
    refreshSession: () => refreshCallback.call(),
    onSessionExpired: () => expiredCallback.call(),
  );
});
