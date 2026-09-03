import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../servers/application/servers_controller.dart';
import '../../../servers/data/invites_repository.dart';
import '../../../servers/data/servers_repository.dart';
import '../../../servers/domain/server_models.dart';

/// Coluna estreita de ícones de servidor à esquerda — mesma gramática visual
/// que qualquer app de comunidades: cada servidor é um círculo, o dono vê
/// suas iniciais quando não há ícone customizado ainda.
class ServerRail extends ConsumerWidget {
  const ServerRail({
    super.key,
    required this.selectedServerId,
    required this.friendsSelected,
    required this.onSelect,
    required this.onSelectFriends,
  });

  final String? selectedServerId;
  final bool friendsSelected;
  final void Function(RelayServer server) onSelect;
  final VoidCallback onSelectFriends;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    final serversAsync = ref.watch(serversProvider);

    return Container(
      width: 76,
      color: relay.surfaceAlt,
      child: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 12),
            _FriendsIcon(selected: friendsSelected, onTap: onSelectFriends),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
              child: Container(height: 1, color: relay.border),
            ),
            Expanded(
              child: serversAsync.when(
                data: (servers) => ListView.builder(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  itemCount: servers.length,
                  itemBuilder: (context, index) {
                    final server = servers[index];
                    final selected = server.id == selectedServerId;
                    return _ServerIcon(
                      server: server,
                      selected: selected,
                      onTap: () => onSelect(server),
                    );
                  },
                ),
                loading: () => const Center(
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
                error: (error, _) => Padding(
                  padding: const EdgeInsets.all(8),
                  child: Icon(Icons.error_outline, color: relay.critical, size: 20),
                ),
              ),
            ),
            _CreateServerButton(),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}

class _FriendsIcon extends StatelessWidget {
  const _FriendsIcon({required this.selected, required this.onTap});

  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: Tooltip(
        message: 'Amigos e conversas',
        child: InkWell(
          borderRadius: BorderRadius.circular(selected ? 16 : 24),
          onTap: onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: selected ? relay.accent : relay.surface,
              borderRadius: BorderRadius.circular(selected ? 16 : 24),
              border: Border.all(color: relay.border),
            ),
            alignment: Alignment.center,
            child: Icon(
              Icons.people_alt_outlined,
              color: selected ? relay.accentInk : relay.wire,
              size: 22,
            ),
          ),
        ),
      ),
    );
  }
}

class _ServerIcon extends StatelessWidget {
  const _ServerIcon({required this.server, required this.selected, required this.onTap});

  final RelayServer server;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 14),
      child: Tooltip(
        message: server.name,
        child: InkWell(
          borderRadius: BorderRadius.circular(selected ? 16 : 24),
          onTap: onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: selected ? relay.accent : relay.surface,
              borderRadius: BorderRadius.circular(selected ? 16 : 24),
              border: Border.all(color: relay.border),
            ),
            alignment: Alignment.center,
            child: Text(
              server.initials,
              style: TextStyle(
                color: selected ? relay.accentInk : relay.ink,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CreateServerButton extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: () => _showMenu(context, ref),
        child: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: relay.surface,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: relay.border),
          ),
          child: Icon(Icons.add, color: relay.wire),
        ),
      ),
    );
  }

  Future<void> _showMenu(BuildContext context, WidgetRef ref) async {
    final choice = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.add_circle_outline),
              title: const Text('Criar servidor'),
              onTap: () => Navigator.pop(context, 'create'),
            ),
            ListTile(
              leading: const Icon(Icons.mail_outline),
              title: const Text('Entrar com convite'),
              onTap: () => Navigator.pop(context, 'join'),
            ),
          ],
        ),
      ),
    );
    if (!context.mounted || choice == null) return;

    if (choice == 'join') {
      await _showJoinDialog(context, ref);
    } else {
      await _showCreateServerDialog(context, ref);
    }
  }

  Future<void> _showCreateServerDialog(BuildContext context, WidgetRef ref) async {
    final controller = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Criar servidor'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(labelText: 'Nome do servidor'),
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
    await ref.read(serversRepositoryProvider).create(name: name);
    ref.invalidate(serversProvider);
  }

  Future<void> _showJoinDialog(BuildContext context, WidgetRef ref) async {
    final controller = TextEditingController();
    final code = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Entrar com convite'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(labelText: 'Código do convite'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Entrar'),
          ),
        ],
      ),
    );
    if (code == null || code.isEmpty) return;

    try {
      await ref.read(invitesRepositoryProvider).joinByCode(code);
      ref.invalidate(serversProvider);
    } on ApiException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }
}
