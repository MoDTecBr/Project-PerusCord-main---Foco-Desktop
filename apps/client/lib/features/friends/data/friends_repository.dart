import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/network_providers.dart';
import '../domain/friend_models.dart';

final friendsRepositoryProvider = Provider<FriendsRepository>((ref) {
  return FriendsRepository(ref.watch(apiClientProvider).dio);
});

class FriendsRepository {
  FriendsRepository(this._dio);

  final Dio _dio;

  Future<List<FriendUser>> listFriends() async {
    try {
      final res = await _dio.get<List<dynamic>>('/friends');
      return res.data!.map((e) => FriendUser.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<PendingFriendRequests> listPending() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/friends/requests');
      final incoming = (res.data!['incoming'] as List<dynamic>)
          .map((e) => FriendRequest.fromIncomingJson(e as Map<String, dynamic>))
          .toList();
      final outgoing = (res.data!['outgoing'] as List<dynamic>)
          .map((e) => FriendRequest.fromOutgoingJson(e as Map<String, dynamic>))
          .toList();
      return PendingFriendRequests(incoming: incoming, outgoing: outgoing);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<void> sendRequest(String username) async {
    try {
      await _dio.post<void>('/friends/requests', data: {'username': username});
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<void> accept(String friendshipId) async {
    try {
      await _dio.post<void>('/friends/requests/$friendshipId/accept');
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<void> decline(String friendshipId) async {
    try {
      await _dio.post<void>('/friends/requests/$friendshipId/decline');
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<void> remove(String friendshipId) async {
    try {
      await _dio.delete<void>('/friends/$friendshipId');
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
