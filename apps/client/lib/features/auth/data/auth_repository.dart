import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/network_providers.dart';
import '../domain/auth_models.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(plainDioProvider));
});

/// Só as chamadas que não podem depender de já ter um access token válido
/// (registro, login, refresh) — por isso usa o Dio "cru", sem interceptor.
class AuthRepository {
  AuthRepository(this._dio);

  final Dio _dio;

  Future<AuthTokens> register({
    required String email,
    required String username,
    required String displayName,
    required String password,
  }) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/auth/register', data: {
        'email': email,
        'username': username,
        'displayName': displayName,
        'password': password,
      });
      return AuthTokens.fromJson(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<AuthTokens> login({
    required String email,
    required String password,
    String? mfaCode,
  }) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/auth/login', data: {
        'email': email,
        'password': password,
        if (mfaCode != null) 'mfaCode': mfaCode,
      });
      return AuthTokens.fromJson(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<AuthTokens?> refresh(String refreshToken) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/auth/refresh', data: {
        'refreshToken': refreshToken,
      });
      return AuthTokens.fromJson(res.data!);
    } on DioException {
      return null;
    }
  }

  Future<void> logout({required String accessToken, required String refreshToken}) async {
    try {
      await _dio.post<void>(
        '/auth/logout',
        data: {'refreshToken': refreshToken},
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
    } on DioException {
      // Logout local sempre acontece independente do servidor confirmar.
    }
  }

  Future<CurrentUser> me(String accessToken) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        '/users/me',
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      return CurrentUser.fromJson(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<CurrentUser> updateProfile({
    required String accessToken,
    String? displayName,
    String? avatarUrl,
  }) async {
    try {
      final res = await _dio.patch<Map<String, dynamic>>(
        '/users/me',
        data: {
          if (displayName != null) 'displayName': displayName,
          if (avatarUrl != null) 'avatarUrl': avatarUrl,
        },
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      return CurrentUser.fromJson(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
