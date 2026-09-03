import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/realtime/realtime_client.dart';
import '../../../core/realtime/realtime_events.dart';
import '../../../core/realtime/realtime_providers.dart';
import '../data/messages_repository.dart';
import '../domain/message_models.dart';

/// Lista de mensagens de UM canal (servidor ou DM), mais recente primeiro —
/// carrega o histórico via REST e depois só recebe atualizações via
/// WebSocket (nunca refaz o REST sozinho, então cada canal aberto tem
/// exatamente os handlers dele, removidos ao fechar — ver `off()`).
final messagesControllerProvider =
    NotifierProvider.family<MessagesController, List<RelayMessage>, String>(
  MessagesController.new,
);

class MessagesController extends FamilyNotifier<List<RelayMessage>, String> {
  late final MessagesRepository _repo;
  late final RealtimeClient _realtime;

  String get _channelId => arg;

  @override
  List<RelayMessage> build(String arg) {
    _repo = ref.watch(messagesRepositoryProvider);
    _realtime = ref.watch(realtimeClientProvider);

    _realtime.on(RealtimeEvent.messageCreate, _handleCreate);
    _realtime.on(RealtimeEvent.messageUpdate, _handleUpdate);
    _realtime.on(RealtimeEvent.messageDelete, _handleDelete);

    ref.onDispose(() {
      _realtime.off(RealtimeEvent.messageCreate, _handleCreate);
      _realtime.off(RealtimeEvent.messageUpdate, _handleUpdate);
      _realtime.off(RealtimeEvent.messageDelete, _handleDelete);
    });

    Future.microtask(_loadInitial);
    return [];
  }

  Future<void> _loadInitial() async {
    final messages = await _repo.list(_channelId);
    state = messages;
  }

  Future<void> loadMore() async {
    if (state.isEmpty) return;
    final older = await _repo.list(_channelId, before: state.last.id);
    if (older.isEmpty) return;
    state = [...state, ...older];
  }

  /// Não adiciona a mensagem otimisticamente: o próprio `message:create`
  /// que o gateway ecoa de volta (o autor também está na room) é quem
  /// insere — evita ficar reconciliando uma cópia local com a "oficial".
  Future<void> send(String? content, {List<MessageAttachment>? attachments}) =>
      _repo.send(_channelId, content: content, attachments: attachments);

  Future<void> editMessage(String messageId, String content) =>
      _repo.update(messageId, content);

  Future<void> deleteMessage(String messageId) => _repo.delete(messageId);

  void _handleCreate(dynamic data) {
    final map = Map<String, dynamic>.from(data as Map);
    if (map['channelId'] != _channelId) return;
    final message = RelayMessage.fromJson(map);
    if (state.any((m) => m.id == message.id)) return;
    state = [message, ...state];
  }

  void _handleUpdate(dynamic data) {
    final map = Map<String, dynamic>.from(data as Map);
    if (map['channelId'] != _channelId) return;
    final updated = RelayMessage.fromJson(map);
    state = [for (final m in state) if (m.id == updated.id) updated else m];
  }

  void _handleDelete(dynamic data) {
    final map = Map<String, dynamic>.from(data as Map);
    if (map['channelId'] != _channelId) return;
    final id = map['id'] as String;
    state = state.where((m) => m.id != id).toList();
  }
}
