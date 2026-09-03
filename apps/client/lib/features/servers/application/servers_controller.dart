import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/servers_repository.dart';
import '../domain/server_models.dart';

final serversProvider = FutureProvider.autoDispose<List<RelayServer>>((ref) async {
  final repo = ref.watch(serversRepositoryProvider);
  return repo.listMine();
});
