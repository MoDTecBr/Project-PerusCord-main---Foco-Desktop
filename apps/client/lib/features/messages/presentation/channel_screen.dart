import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/realtime/realtime_events.dart';
import '../../../core/realtime/realtime_providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/user_avatar.dart';
import '../../servers/domain/server_detail_models.dart';
import '../application/messages_controller.dart';
import '../application/typing_controller.dart';
import '../data/uploads_repository.dart';
import '../domain/message_models.dart';

const _extensionToMimeType = {
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'webp': 'image/webp',
};

String _guessMimeType(String filename) {
  final ext = filename.contains('.') ? filename.split('.').last.toLowerCase() : '';
  return _extensionToMimeType[ext] ?? 'image/jpeg';
}

class ChannelScreen extends ConsumerStatefulWidget {
  const ChannelScreen({super.key, required this.channel, required this.currentUserId});

  final RelayChannel channel;
  final String currentUserId;

  @override
  ConsumerState<ChannelScreen> createState() => _ChannelScreenState();
}

class _ChannelScreenState extends ConsumerState<ChannelScreen> {
  final _inputController = TextEditingController();
  final _scrollController = ScrollController();
  Timer? _stopTypingTimer;
  bool _isTyping = false;
  MessageAttachment? _pendingAttachment;
  bool _uploading = false;
  String? _uploadError;

  String get _channelId => widget.channel.id;

  @override
  void dispose() {
    _stopTypingTimer?.cancel();
    if (_isTyping) {
      ref.read(realtimeClientProvider).emit(RealtimeEvent.typingStop, {'channelId': _channelId});
    }
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onInputChanged(String value) {
    final realtime = ref.read(realtimeClientProvider);
    if (value.isEmpty) {
      _stopTypingTimer?.cancel();
      if (_isTyping) {
        _isTyping = false;
        realtime.emit(RealtimeEvent.typingStop, {'channelId': _channelId});
      }
      return;
    }
    if (!_isTyping) {
      _isTyping = true;
      realtime.emit(RealtimeEvent.typingStart, {'channelId': _channelId});
    }
    _stopTypingTimer?.cancel();
    _stopTypingTimer = Timer(const Duration(seconds: 3), () {
      _isTyping = false;
      realtime.emit(RealtimeEvent.typingStop, {'channelId': _channelId});
    });
  }

  Future<void> _editMessage(RelayMessage message) async {
    final controller = TextEditingController(text: message.content);
    final newContent = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Editar mensagem'),
        content: TextField(controller: controller, autofocus: true, maxLines: 4),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Salvar'),
          ),
        ],
      ),
    );
    if (newContent == null || newContent.isEmpty || newContent == message.content) return;
    await ref.read(messagesControllerProvider(_channelId).notifier).editMessage(message.id, newContent);
  }

  Future<void> _deleteMessage(RelayMessage message) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Apagar mensagem?'),
        content: const Text('Essa ação não pode ser desfeita.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Apagar'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await ref.read(messagesControllerProvider(_channelId).notifier).deleteMessage(message.id);
  }

  Future<void> _pickAndUploadImage() async {
    final picked = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 90);
    if (picked == null) return;

    setState(() {
      _uploading = true;
      _uploadError = null;
    });

    try {
      final bytes = await picked.readAsBytes();
      final mimeType = picked.mimeType ?? _guessMimeType(picked.name);
      final attachment = await ref.read(uploadsRepositoryProvider).uploadImage(
            bytes: bytes,
            filename: picked.name,
            mimeType: mimeType,
          );
      if (!mounted) return;
      setState(() {
        _pendingAttachment = attachment;
        _uploading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _uploading = false;
        _uploadError = e.message;
      });
    }
  }

  void _send() {
    final content = _inputController.text.trim();
    final attachment = _pendingAttachment;
    if (content.isEmpty && attachment == null) return;

    ref.read(messagesControllerProvider(_channelId).notifier).send(
          content.isEmpty ? null : content,
          attachments: attachment != null ? [attachment] : null,
        );
    _inputController.clear();
    setState(() {
      _pendingAttachment = null;
      _uploadError = null;
    });
    _stopTypingTimer?.cancel();
    if (_isTyping) {
      _isTyping = false;
      ref.read(realtimeClientProvider).emit(RealtimeEvent.typingStop, {'channelId': _channelId});
    }
  }

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    final messages = ref.watch(messagesControllerProvider(_channelId));
    final typingUsers = ref.watch(typingUsersProvider(_channelId));

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: relay.border))),
          child: Row(
            children: [
              Icon(Icons.tag, size: 18, color: relay.inkFaint),
              const SizedBox(width: 6),
              Text(widget.channel.name, style: Theme.of(context).textTheme.titleMedium),
              if (widget.channel.topic != null) ...[
                const SizedBox(width: 12),
                Container(width: 1, height: 16, color: relay.border),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    widget.channel.topic!,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: relay.inkFaint, fontSize: 13),
                  ),
                ),
              ],
            ],
          ),
        ),
        Expanded(
          child: messages.isEmpty
              ? Center(
                  child: Text(
                    'Nenhuma mensagem ainda. Que tal começar a conversa?',
                    style: TextStyle(color: relay.inkFaint),
                  ),
                )
              : ListView.builder(
                  controller: _scrollController,
                  reverse: true,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final message = messages[index];
                    final isOwn = message.author.id == widget.currentUserId;
                    return _MessageRow(
                      message: message,
                      isOwn: isOwn,
                      onEdit: isOwn ? () => _editMessage(message) : null,
                      onDelete: isOwn ? () => _deleteMessage(message) : null,
                    );
                  },
                ),
        ),
        if (typingUsers.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 6),
            child: Text(
              typingUsers.length == 1 ? 'Alguém está digitando…' : '${typingUsers.length} pessoas estão digitando…',
              style: TextStyle(color: relay.inkFaint, fontSize: 12, fontStyle: FontStyle.italic),
            ),
          ),
        if (_uploadError != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 6),
            child: Text(_uploadError!, style: TextStyle(color: relay.critical, fontSize: 12)),
          ),
        if (_pendingAttachment != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(_pendingAttachment!.url, width: 72, height: 72, fit: BoxFit.cover),
                  ),
                  Positioned(
                    top: -8,
                    right: -8,
                    child: IconButton(
                      icon: const Icon(Icons.cancel, size: 18),
                      color: relay.inkFaint,
                      onPressed: () => setState(() => _pendingAttachment = null),
                    ),
                  ),
                ],
              ),
            ),
          ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: IconButton(
                  tooltip: 'Enviar imagem',
                  onPressed: _uploading ? null : _pickAndUploadImage,
                  icon: _uploading
                      ? SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: relay.wire),
                        )
                      : Icon(Icons.image_outlined, color: relay.wire),
                ),
              ),
              Expanded(
                child: TextField(
                  controller: _inputController,
                  maxLength: 2000,
                  maxLengthEnforcement: MaxLengthEnforcement.enforced,
                  maxLines: 10,
                  minLines: 1,
                  onChanged: _onInputChanged,
                  onSubmitted: (_) => _send(),
                  textInputAction: TextInputAction.send,
                  buildCounter: (
                    BuildContext context, {
                    required int currentLength,
                    required bool isFocused,
                    required int? maxLength,
                  }) {
                    if (currentLength < 1500) {
                      return null;
                    }
                    final isNearLimit = currentLength >= (maxLength! - 100);
                    return Padding(
                      padding: const EdgeInsets.only(top: 2, right: 4),
                      child: Text(
                        '$currentLength / $maxLength',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: isNearLimit ? FontWeight.bold : FontWeight.normal,
                          color: isNearLimit ? relay.critical : relay.inkFaint,
                        ),
                      ),
                    );
                  },
                  decoration: InputDecoration(
                    hintText: 'Mensagem em #${widget.channel.name}',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: IconButton.filled(
                  onPressed: _send,
                  icon: const Icon(Icons.send, size: 18),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _MessageRow extends StatelessWidget {
  const _MessageRow({
    required this.message,
    required this.isOwn,
    this.onEdit,
    this.onDelete,
  });

  final RelayMessage message;
  final bool isOwn;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    final time = TimeOfDay.fromDateTime(message.createdAt.toLocal());
    final timeLabel = '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          UserAvatar(
            displayName: message.author.displayName,
            avatarUrl: message.author.avatarUrl,
            radius: 17,
            backgroundColor: isOwn ? relay.accent : relay.wire,
            foregroundColor: isOwn ? relay.accentInk : relay.background,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(message.author.displayName,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                    const SizedBox(width: 8),
                    Text(timeLabel, style: TextStyle(color: relay.inkFaint, fontSize: 11)),
                    if (message.editedAt != null) ...[
                      const SizedBox(width: 6),
                      Text('(editado)', style: TextStyle(color: relay.inkFaint, fontSize: 11)),
                    ],
                  ],
                ),
                if (message.content.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(message.content, style: TextStyle(color: relay.ink, fontSize: 14)),
                ],
                if (message.attachments.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final attachment in message.attachments)
                        if (attachment.isImage)
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: GestureDetector(
                              onTap: () => _openImagePreview(context, attachment.url),
                              child: Image.network(
                                attachment.url,
                                width: 240,
                                height: 180,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stack) => Container(
                                  width: 240,
                                  height: 180,
                                  color: relay.surfaceAlt,
                                  alignment: Alignment.center,
                                  child: Icon(Icons.broken_image_outlined, color: relay.inkFaint),
                                ),
                              ),
                            ),
                          )
                        else
                          _FileChip(attachment: attachment),
                    ],
                  ),
                ],
              ],
            ),
          ),
          if (onEdit != null || onDelete != null)
            PopupMenuButton<String>(
              icon: Icon(Icons.more_horiz, size: 18, color: relay.inkFaint),
              onSelected: (value) => value == 'edit' ? onEdit?.call() : onDelete?.call(),
              itemBuilder: (context) => [
                if (onEdit != null) const PopupMenuItem(value: 'edit', child: Text('Editar')),
                if (onDelete != null) const PopupMenuItem(value: 'delete', child: Text('Apagar')),
              ],
            ),
        ],
      ),
    );
  }

  void _openImagePreview(BuildContext context, String url) {
    showDialog<void>(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: GestureDetector(
          onTap: () => Navigator.pop(context),
          child: InteractiveViewer(child: Image.network(url)),
        ),
      ),
    );
  }
}

class _FileChip extends StatelessWidget {
  const _FileChip({required this.attachment});

  final MessageAttachment attachment;

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: relay.surfaceAlt,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: relay.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.insert_drive_file_outlined, size: 16, color: relay.inkFaint),
          const SizedBox(width: 6),
          Text(attachment.filename, style: TextStyle(color: relay.inkSoft, fontSize: 12.5)),
        ],
      ),
    );
  }
}