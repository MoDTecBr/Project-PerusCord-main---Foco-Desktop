import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persiste os tokens de sessão no cofre seguro do SO (Keychain no
/// iOS/macOS, Keystore no Android, DPAPI no Windows) — nunca em
/// SharedPreferences puro ou em texto simples em disco.
///
/// Na web, o cofre depende da Web Crypto API do navegador, que só existe em
/// "contexto seguro" (HTTPS ou `localhost`) — acessar por IP puro em HTTP
/// (ex: testando via Radmin VPN) faz toda chamada falhar. Sem tratar isso, o
/// app trava para sempre esperando uma resposta que nunca chega. Aqui,
/// degradamos: a sessão simplesmente não sobrevive a um F5 nesse cenário,
/// em vez de travar o login inteiro.
class TokenStorage {
  TokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _accessTokenKey = 'relay.accessToken';
  static const _refreshTokenKey = 'relay.refreshToken';

  Future<void> save({required String accessToken, required String refreshToken}) async {
    try {
      await Future.wait([
        _storage.write(key: _accessTokenKey, value: accessToken),
        _storage.write(key: _refreshTokenKey, value: refreshToken),
      ]);
    } catch (error) {
      debugPrint('TokenStorage.save falhou (sessão não vai persistir): $error');
    }
  }

  Future<String?> readAccessToken() => _safeRead(_accessTokenKey);
  Future<String?> readRefreshToken() => _safeRead(_refreshTokenKey);

  Future<String?> _safeRead(String key) async {
    try {
      return await _storage.read(key: key);
    } catch (error) {
      debugPrint('TokenStorage.read falhou: $error');
      return null;
    }
  }

  Future<void> clear() async {
    try {
      await Future.wait([
        _storage.delete(key: _accessTokenKey),
        _storage.delete(key: _refreshTokenKey),
      ]);
    } catch (error) {
      debugPrint('TokenStorage.clear falhou: $error');
    }
  }
}
