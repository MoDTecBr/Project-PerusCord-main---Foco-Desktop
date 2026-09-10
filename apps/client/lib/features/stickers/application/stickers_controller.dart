import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/stickers_repository.dart';
import '../domain/sticker_models.dart';

/// Figurinhas são por usuário (não por servidor) — a mesma lista vale em
/// qualquer servidor/DM que a pessoa estiver.
final stickersListProvider = FutureProvider.autoDispose<List<Sticker>>((ref) async {
  return ref.watch(stickersRepositoryProvider).list();
});
