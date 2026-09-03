import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_theme.dart';
import '../../application/server_detail_controller.dart';
import '../../data/channels_repository.dart';
import '../../data/invites_repository.dart';
import '../../domain/server_detail_models.dart';
import '../../../voice/application/voice_presence_controller.dart';
import '../../../voice/domain/voice_presence.dart';

class ChannelSidebar extends ConsumerWidget {
  const ChannelSidebar({
    super.key,
    required this.server,
    required this.selectedChannelId,
    required this.onSelect,
  });

  final ServerDetail server;
  final String? selectedChannelId;
  final void Function(RelayChannel channel) onSelect;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    final presence = ref.watch(voicePresenceProvider(server.id)).valueOrNull ?? const {};

    final uncategorized = server.channelsIn(null);
    return Container(
      width: 232,
      color: relay.surfaceAlt,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 18, 8, 12),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    server.name,
                    style: Theme.of(context).textTheme.titleMedium,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                IconButton(
                  tooltip: 'Convidar pessoas',
                  icon: Icon(Icons.person_add_alt_outlined, size: 20, color: relay.wire),
                  onPressed: () => _showInviteDialog(context, ref),
                ),
                IconButton(
                  tooltip: 'Criar canal ou categoria',
                  icon: Icon(Icons.add_circle_outline, size: 20, color: relay.wire),
                  onPressed: () => _showCreateMenu(context, ref),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              children: [
                for (final channel in uncategorized)
                  _ChannelTile(
                    channel: channel,
                    selected: channel.id == selectedChannelId,
                    onTap: () => onSelect(channel),
                    participants: presence[channel.id] ?? const [],
                  ),
                for (final category in server.categories) ...[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(10, 16, 10, 4),
                    child: Text(
                      category.name.toUpperCase(),
                      style: TextStyle(
                        color: relay.inkFaint,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.4,
                      ),
                    ),
                  ),
                  for (final channel in server.channelsIn(category.id))
                    _ChannelTile(
                      channel: channel,
                      selected: channel.id == selectedChannelId,
                      onTap: () => onSelect(channel),
                      participants: presence[channel.id] ?? const [],
                    ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showInviteDialog(BuildContext context, WidgetRef ref) async {
    String? code;
    String? error;
    try {
      code = await ref.read(invitesRepositoryProvider).createInvite(server.id, expiresInSeconds: 60 * 60 * 24 * 7);
    } on ApiException catch (e) {
      error = e.message;
    }

    if (!context.mounted) return;

    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Convidar pessoas'),
        content: error != null
            ? Text(error, style: TextStyle(color: Theme.of(context).extension<RelayColors>()!.palette.critical))
            : Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Compartilhe este código — vale por 7 dias:'),
                  const SizedBox(height: 12),
                  SelectableText(
                    code ?? '',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, letterSpacing: 1),
                  ),
                ],
              ),
        actions: [
          if (code != null)
            TextButton.icon(
              onPressed: () {
                Clipboard.setData(ClipboardData(text: code!));
                ScaffoldMessenger.of(context)
                    .showSnackBar(const SnackBar(content: Text('Código copiado!')));
              },
              icon: const Icon(Icons.copy, size: 16),
              label: const Text('Copiar'),
            ),
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Fechar')),
        ],
      ),
    );
  }

  Future<void> _showCreateMenu(BuildContext context, WidgetRef ref) async {
    final choice = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.tag),
              title: const Text('Criar canal'),
              onTap: () => Navigator.pop(context, 'channel'),
            ),
            ListTile(
              leading: const Icon(Icons.folder_outlined),
              title: const Text('Criar categoria'),
              onTap: () => Navigator.pop(context, 'category'),
            ),
          ],
        ),
      ),
    );
    if (!context.mounted || choice == null) return;

    if (choice == 'category') {
      await _createCategory(context, ref);
    } else {
      await _createChannel(context, ref);
    }
  }

  Future<void> _createCategory(BuildContext context, WidgetRef ref) async {
    final controller = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Criar categoria'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(labelText: 'Nome da categoria'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Criar'),
          ),
        ],
      ),
    );
    if (name == null || name.isEmpty) return;
    await ref.read(channelsRepositoryProvider).createCategory(server.id, name);
    ref.invalidate(serverDetailProvider(server.id));
  }

  Future<void> _createChannel(BuildContext context, WidgetRef ref) async {
    final result = await showDialog<_NewChannelForm>(
      context: context,
      builder: (context) => _CreateChannelDialog(categories: server.categories),
    );
    if (result == null || result.name.isEmpty) return;

    try {
      await ref.read(channelsRepositoryProvider).createChannel(
            server.id,
            name: result.name,
            type: result.type,
            categoryId: result.categoryId,
          );
      ref.invalidate(serverDetailProvider(server.id));
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Não foi possível criar o canal.')),
        );
      }
    }
  }
}

class _NewChannelForm {
  const _NewChannelForm({required this.name, required this.type, required this.categoryId});
  final String name;
  final String type;
  final String? categoryId;
}

class _CreateChannelDialog extends StatefulWidget {
  const _CreateChannelDialog({required this.categories});

  final List<RelayCategory> categories;

  @override
  State<_CreateChannelDialog> createState() => _CreateChannelDialogState();
}

class _CreateChannelDialogState extends State<_CreateChannelDialog> {
  final _nameController = TextEditingController();
  String _type = 'TEXT';
  String? _categoryId;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Criar canal'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _nameController,
            autofocus: true,
            decoration: const InputDecoration(labelText: 'Nome do canal'),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _type,
            decoration: const InputDecoration(labelText: 'Tipo'),
            items: const [
              DropdownMenuItem(value: 'TEXT', child: Text('Texto')),
              DropdownMenuItem(value: 'VOICE', child: Text('Voz')),
              DropdownMenuItem(value: 'VIDEO', child: Text('Vídeo')),
            ],
            onChanged: (value) => setState(() => _type = value ?? 'TEXT'),
          ),
          if (widget.categories.isNotEmpty) ...[
            const SizedBox(height: 16),
            DropdownButtonFormField<String?>(
              initialValue: _categoryId,
              decoration: const InputDecoration(labelText: 'Categoria'),
              items: [
                const DropdownMenuItem<String?>(value: null, child: Text('Sem categoria')),
                for (final category in widget.categories)
                  DropdownMenuItem<String?>(value: category.id, child: Text(category.name)),
              ],
              onChanged: (value) => setState(() => _categoryId = value),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
        FilledButton(
          onPressed: () => Navigator.pop(
            context,
            _NewChannelForm(name: _nameController.text.trim(), type: _type, categoryId: _categoryId),
          ),
          child: const Text('Criar'),
        ),
      ],
    );
  }
}

class _ChannelTile extends StatelessWidget {
  const _ChannelTile({
    required this.channel,
    required this.selected,
    required this.onTap,
    this.participants = const [],
  });

  final RelayChannel channel;
  final bool selected;
  final VoidCallback onTap;
  final List<VoicePresenceParticipant> participants;

  IconData get _icon => switch (channel.type) {
        ChannelKind.text => Icons.tag,
        ChannelKind.voice => Icons.volume_up_outlined,
        ChannelKind.video => Icons.videocam_outlined,
        ChannelKind.dm => Icons.person_outline,
      };

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 1),
      child: Material(
        color: selected ? relay.surface : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(_icon, size: 17, color: selected ? relay.ink : relay.inkFaint),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        channel.name,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: selected ? relay.ink : relay.inkSoft,
                          fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ],
                ),
                if (participants.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(left: 25, top: 3),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        for (final p in participants)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 2),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                CircleAvatar(
                                  radius: 8,
                                  backgroundColor: relay.wire,
                                  child: Text(
                                    p.name.isNotEmpty ? p.name.substring(0, 1).toUpperCase() : '?',
                                    style: TextStyle(
                                      color: relay.background,
                                      fontSize: 8,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Flexible(
                                  child: Text(
                                    p.name,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(color: relay.inkFaint, fontSize: 12),
                                  ),
                                ),
                                if (p.isSharingScreen) ...[
                                  const SizedBox(width: 4),
                                  Icon(Icons.screen_share, size: 11, color: relay.accent),
                                ],
                                const SizedBox(width: 6),
                                _ElapsedTimeLabel(since: p.joinedAt, color: relay.inkFaint),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Tempo decorrido desde que a pessoa entrou na call, atualizado a cada
/// segundo — só esse texto re-renderiza, não a sidebar inteira.
class _ElapsedTimeLabel extends StatefulWidget {
  const _ElapsedTimeLabel({required this.since, required this.color});

  final DateTime since;
  final Color color;

  @override
  State<_ElapsedTimeLabel> createState() => _ElapsedTimeLabelState();
}

class _ElapsedTimeLabelState extends State<_ElapsedTimeLabel> {
  late Timer _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => setState(() {}));
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  String get _formatted {
    final elapsed = DateTime.now().difference(widget.since);
    if (elapsed.isNegative) return '0:00';
    final hours = elapsed.inHours;
    final minutes = elapsed.inMinutes.remainder(60);
    final seconds = elapsed.inSeconds.remainder(60);
    final mm = minutes.toString().padLeft(hours > 0 ? 2 : 1, '0');
    final ss = seconds.toString().padLeft(2, '0');
    return hours > 0 ? '$hours:$mm:$ss' : '$mm:$ss';
  }

  @override
  Widget build(BuildContext context) {
    return Text(
      _formatted,
      style: TextStyle(color: widget.color, fontSize: 11, fontFeatures: const [FontFeature.tabularFigures()]),
    );
  }
}
