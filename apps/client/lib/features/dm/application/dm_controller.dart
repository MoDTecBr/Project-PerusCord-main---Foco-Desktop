import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/dm_repository.dart';
import '../domain/dm_models.dart';

final dmConversationsProvider = FutureProvider.autoDispose<List<DmConversation>>((ref) async {
  return ref.watch(dmRepositoryProvider).list();
});
