import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/access_token_holder.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/network/network_providers.dart';
import '../../../core/network/token_storage.dart';
import '../data/auth_repository.dart';
import '../domain/auth_models.dart';

sealed class AuthState {
  const AuthState();
}

/// Ainda checando se há uma sessão salva (splash screen fica neste estado).
class AuthInitial extends AuthState {
  const AuthInitial();
}

class AuthAuthenticating extends AuthState {
  const AuthAuthenticating();
}

class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated({this.error});
  final String? error;
}

class AuthAuthenticated extends AuthState {
  const AuthAuthenticated(this.user);
  final CurrentUser user;
}

final authControllerProvider = NotifierProvider<AuthController, AuthState>(AuthController.new);

class AuthController extends Notifier<AuthState> {
  late final AuthRepository _repo;
  late final TokenStorage _storage;
  late final AccessTokenHolder _tokenHolder;

  @override
  AuthState build() {
    _repo = ref.watch(authRepositoryProvider);
    _storage = ref.watch(tokenStorageProvider);
    _tokenHolder = ref.watch(accessTokenHolderProvider);

    // Conecta os callbacks que o ApiClient chama de fora (ver network_providers.dart).
    ref.read(refreshSessionCallbackProvider).call = _refreshSession;
    ref.read(sessionExpiredCallbackProvider).call = _scheduleForceLogout;

    Future.microtask(_bootstrap);
    return const AuthInitial();
  }

  /// Roda uma vez, no cold start: tenta restaurar a sessão a partir do
  /// refresh token salvo. Sem refresh token válido, cai para a tela de login.
  Future<void> _bootstrap() async {
    final refreshToken = await _storage.readRefreshToken();
    if (refreshToken == null) {
      state = const AuthUnauthenticated();
      return;
    }
    final tokens = await _repo.refresh(refreshToken);
    if (tokens == null) {
      await _storage.clear();
      state = const AuthUnauthenticated();
      return;
    }
    await _applyTokens(tokens);
  }

  Future<void> register({
    required String email,
    required String username,
    required String displayName,
    required String password,
  }) async {
    state = const AuthAuthenticating();
    try {
      final tokens = await _repo.register(
        email: email,
        username: username,
        displayName: displayName,
        password: password,
      );
      await _applyTokens(tokens);
    } on ApiException catch (e) {
      state = AuthUnauthenticated(error: e.message);
    } catch (e) {
      // Nunca deixa a tela travada num spinner infinito por um erro que não
      // veio da API (ex: armazenamento local falhando).
      state = AuthUnauthenticated(error: 'Algo deu errado: $e');
    }
  }

  Future<void> login({required String email, required String password, String? mfaCode}) async {
    state = const AuthAuthenticating();
    try {
      final tokens = await _repo.login(email: email, password: password, mfaCode: mfaCode);
      await _applyTokens(tokens);
    } on ApiException catch (e) {
      state = AuthUnauthenticated(error: e.message);
    } catch (e) {
      state = AuthUnauthenticated(error: 'Algo deu errado: $e');
    }
  }

  Future<void> logout() async {
    final refreshToken = await _storage.readRefreshToken();
    final accessToken = _tokenHolder.current;
    if (refreshToken != null && accessToken != null) {
      await _repo.logout(accessToken: accessToken, refreshToken: refreshToken);
    }
    await _forceLogoutInternal();
  }

  /// Chamado pelo ApiClient quando uma requisição leva 401 — tenta renovar a
  /// sessão sem derrubar a tela atual do usuário.
  Future<bool> _refreshSession() async {
    final refreshToken = await _storage.readRefreshToken();
    if (refreshToken == null) return false;
    final tokens = await _repo.refresh(refreshToken);
    if (tokens == null) return false;
    await _applyTokens(tokens, fetchUser: false);
    return true;
  }

  /// Salva nome de exibição e/ou avatar do usuário logado e atualiza o
  /// estado local com o resultado retornado pela API.
  Future<void> updateProfile({String? displayName, String? avatarUrl}) async {
    final accessToken = _tokenHolder.current;
    if (accessToken == null) return;
    final user = await _repo.updateProfile(
      accessToken: accessToken,
      displayName: displayName,
      avatarUrl: avatarUrl,
    );
    state = AuthAuthenticated(user);
  }

  void _scheduleForceLogout() {
    Future.microtask(_forceLogoutInternal);
  }

  Future<void> _forceLogoutInternal() async {
    _tokenHolder.current = null;
    await _storage.clear();
    state = const AuthUnauthenticated();
  }

  Future<void> _applyTokens(AuthTokens tokens, {bool fetchUser = true}) async {
    _tokenHolder.current = tokens.accessToken;
    await _storage.save(accessToken: tokens.accessToken, refreshToken: tokens.refreshToken);
    if (!fetchUser) return;

    try {
      final user = await _repo.me(tokens.accessToken);
      state = AuthAuthenticated(user);
    } on ApiException catch (e) {
      state = AuthUnauthenticated(error: e.message);
    }
  }
}
