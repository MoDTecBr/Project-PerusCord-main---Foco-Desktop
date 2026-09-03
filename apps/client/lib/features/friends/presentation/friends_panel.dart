import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/user_avatar.dart';
import '../../dm/application/dm_controller.dart';
import '../../dm/data/dm_repository.dart';
import '../../messages/presentation/channel_screen.dart';
import '../../servers/domain/server_detail_models.dart';
import '../application/friends_controller.dart';
import '../data/friends_repository.dart';
import '../domain/friend_models.dart';

/// Painel de amigos e conversas diretas — a mesma área da tela que, na
/// `ServerRail`, fica atrás do botão dedicado no topo (não é um servidor).
class FriendsPanel extends ConsumerStatefulWidget {
  const FriendsPanel({super.key, required this.currentUserId});

  final String currentUserId;

  @override
  ConsumerState<FriendsPanel> createState() => _FriendsPanelState();
}

class _FriendsPanelState extends ConsumerState<FriendsPanel> {
  RelayChannel? _openDm;

  Future<void> _openDmWith(FriendUser friend) async {
    final convo =
        await ref.read(dmRepositoryProvider).openWith(friend.username);
    if (!mounted) return;
    setState(() {
      _openDm = RelayChannel(
        id: convo.channelId,
        name: friend.displayName,
        type: ChannelKind.dm,
        categoryId: null,
        position: 0,
        topic: '@${friend.username}',
      );
    });
    ref.invalidate(dmConversationsProvider);
  }

  Future<void> _showAddFriendDialog() async {
    final controller = TextEditingController();
    final username = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Adicionar amigo'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(labelText: 'Nome de usuário'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar')),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Enviar solicitação'),
          ),
        ],
      ),
    );
    if (username == null || username.isEmpty || !mounted) return;

    try {
      await ref.read(friendsRepositoryProvider).sendRequest(username);
      ref.invalidate(pendingRequestsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Solicitação enviada para @$username.')));
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;

    if (_openDm != null) {
      return Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: relay.border))),
            child: Row(
              children: [
                IconButton(
                  onPressed: () => setState(() => _openDm = null),
                  icon: const Icon(Icons.arrow_back, size: 20),
                ),
                Text(_openDm!.name,
                    style: Theme.of(context).textTheme.titleMedium),
              ],
            ),
          ),
          Expanded(
            child: ChannelScreen(
              key: ValueKey(_openDm!.id),
              channel: _openDm!,
              currentUserId: widget.currentUserId,
            ),
          ),
        ],
      );
    }

    final friendsAsync = ref.watch(friendsListProvider);
    final pendingAsync = ref.watch(pendingRequestsProvider);
    final dmAsync = ref.watch(dmConversationsProvider);

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Row(
          children: [
            Text('Amigos e conversas',
                style: Theme.of(context).textTheme.headlineMedium),
            const Spacer(),
            FilledButton.icon(
              onPressed: _showAddFriendDialog,
              icon: const Icon(Icons.person_add_alt, size: 18),
              label: const Text('Adicionar amigo'),
            ),
          ],
        ),
        const SizedBox(height: 28),
        pendingAsync.when(
          loading: () => const SizedBox.shrink(),
          error: (_, __) => const SizedBox.shrink(),
          data: (pending) {
            if (pending.incoming.isEmpty && pending.outgoing.isEmpty) {
              return const SizedBox.shrink();
            }
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (pending.incoming.isNotEmpty) ...[
                  const _SectionLabel('Solicitações recebidas'),
                  for (final request in pending.incoming)
                    _IncomingRequestTile(request: request),
                  const SizedBox(height: 20),
                ],
                if (pending.outgoing.isNotEmpty) ...[
                  const _SectionLabel('Solicitações enviadas'),
                  for (final request in pending.outgoing)
                    _OutgoingRequestTile(request: request),
                  const SizedBox(height: 20),
                ],
              ],
            );
          },
        ),
        const _SectionLabel('Conversas'),
        dmAsync.when(
          loading: () => const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: LinearProgressIndicator(),
          ),
          error: (_, __) => Text('Não deu para carregar as conversas.',
              style: TextStyle(color: relay.critical)),
          data: (conversations) => conversations.isEmpty
              ? Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text('Nenhuma conversa ainda.',
                      style: TextStyle(color: relay.inkFaint)),
                )
              : Column(
                  children: [
                    for (final convo in conversations)
                      if (convo.participant != null)
                        _FriendTile(
                          friend: convo.participant!,
                          onTap: () => _openDmWith(convo.participant!),
                        ),
                  ],
                ),
        ),
        const SizedBox(height: 20),
        const _SectionLabel('Amigos'),
        friendsAsync.when(
          loading: () => const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: LinearProgressIndicator(),
          ),
          error: (_, __) => Text('Não deu para carregar seus amigos.',
              style: TextStyle(color: relay.critical)),
          data: (friends) => friends.isEmpty
              ? Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    'Você ainda não tem amigos. Use "Adicionar amigo" para começar.',
                    style: TextStyle(color: relay.inkFaint),
                  ),
                )
              : Column(
                  children: [
                    for (final friend in friends)
                      _FriendTile(
                          friend: friend, onTap: () => _openDmWith(friend)),
                  ],
                ),
        ),
      ],
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          color: relay.inkFaint,
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}

class _FriendTile extends StatelessWidget {
  const _FriendTile({required this.friend, required this.onTap});

  final FriendUser friend;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    final online = friend.status != 'OFFLINE';
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        onTap: onTap,
        leading: Stack(
          children: [
            UserAvatar(displayName: friend.displayName, avatarUrl: friend.avatarUrl),
            if (online)
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: relay.good,
                    shape: BoxShape.circle,
                    border: Border.all(color: relay.surface, width: 2),
                  ),
                ),
              ),
          ],
        ),
        title: Text(friend.displayName),
        subtitle: Text('@${friend.username}'),
        trailing:
            Icon(Icons.chat_bubble_outline, size: 18, color: relay.inkFaint),
      ),
    );
  }
}

class _IncomingRequestTile extends ConsumerWidget {
  const _IncomingRequestTile({required this.request});

  final FriendRequest request;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(request.otherUser.displayName),
        subtitle: Text('@${request.otherUser.username}'),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              tooltip: 'Aceitar',
              icon: const Icon(Icons.check_circle_outline),
              onPressed: () async {
                await ref.read(friendsRepositoryProvider).accept(request.id);
                ref.invalidate(pendingRequestsProvider);
                ref.invalidate(friendsListProvider);
              },
            ),
            IconButton(
              tooltip: 'Recusar',
              icon: const Icon(Icons.cancel_outlined),
              onPressed: () async {
                await ref.read(friendsRepositoryProvider).decline(request.id);
                ref.invalidate(pendingRequestsProvider);
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _OutgoingRequestTile extends ConsumerWidget {
  const _OutgoingRequestTile({required this.request});

  final FriendRequest request;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(request.otherUser.displayName),
        subtitle: Text('@${request.otherUser.username} — aguardando resposta',
            style: TextStyle(color: relay.inkFaint)),
        trailing: TextButton(
          onPressed: () async {
            await ref.read(friendsRepositoryProvider).remove(request.id);
            ref.invalidate(pendingRequestsProvider);
          },
          child: const Text('Cancelar'),
        ),
      ),
    );
  }
}
