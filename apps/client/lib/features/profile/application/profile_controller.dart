import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/profile_repository.dart';
import '../domain/user_profile.dart';

final userProfileProvider =
    FutureProvider.autoDispose.family<UserProfile, String>((ref, userId) async {
  return ref.watch(profileRepositoryProvider).getProfile(userId);
});
