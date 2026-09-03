import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/realtime/realtime_client.dart';
import '../../../core/realtime/realtime_providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/application/auth_controller.dart';
import '../../auth/domain/auth_models.dart';
import '../../auth/presentation/user_profile_dialog.dart';
import '../../friends/presentation/friends_panel.dart';
import '../../messages/presentation/channel_screen.dart';
import '../../servers/application/server_detail_controller.dart';
import '../../servers/domain/server_detail_models.dart';
import '../../servers/domain/server_models.dart';
import '../../servers/presentation/widgets/channel_sidebar.dart';
import '../../servers/presentation/widgets/member_list_panel.dart';
import '../../voice/presentation/voice_call_bar.dart';
import '../../voice/presentation/voice_channel_screen.dart';
import 'widgets/server_rail.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  RelayServer? _selectedServer;
  String? _selectedChannelId; // NOVO: Estado elevado para funcionar no Drawer!
  bool _friendsSelected = false;

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    final authState = ref.watch(authControllerProvider);
    final user = authState is AuthAuthenticated ? authState.user : null;

    // VERIFICAÇÃO DE RESPONSIVIDADE (Celular vs Desktop)
    final isMobile = MediaQuery.of(context).size.width < 800;

    return Scaffold(
      // O DRAWER SÓ EXISTE NO CELULAR
      drawer: isMobile
          ? _MobileDrawer(
              selectedServer: _selectedServer,
              selectedChannelId: _selectedChannelId,
              friendsSelected: _friendsSelected,
              onServerSelect: (server) => setState(() {
                _selectedServer = server;
                _selectedChannelId = null; // Reseta o canal ao trocar de servidor
                _friendsSelected = false;
              }),
              onFriendsSelect: () => setState(() {
                _friendsSelected = true;
                _selectedServer = null;
              }),
              onChannelSelect: (channelId) => setState(() {
                _selectedChannelId = channelId;
              }),
            )
          : null,
      body: Column(
        children: [
          Expanded(
            child: Row(
              children: [
                // ESCONDE AS BARRAS LATERAIS NO CELULAR
                if (!isMobile) ...[
                  ServerRail(
                    selectedServerId: _selectedServer?.id,
                    friendsSelected: _friendsSelected,
                    onSelect: (server) => setState(() {
                      _selectedServer = server;
                      _selectedChannelId = null;
                      _friendsSelected = false;
                    }),
                    onSelectFriends: () => setState(() {
                      _friendsSelected = true;
                      _selectedServer = null;
                    }),
                  ),
                  Container(width: 1, color: relay.border),
                ],
                Expanded(
                  child: Column(
                    children: [
                      _TopBar(user: user, isMobile: isMobile),
                      Container(height: 1, color: relay.border),
                      Expanded(
                        child: _friendsSelected
                            ? FriendsPanel(currentUserId: user?.id ?? '')
                            : _selectedServer == null
                                ? const _WelcomeBody()
                                : _ServerBody(
                                    key: ValueKey(_selectedServer!.id),
                                    server: _selectedServer!,
                                    currentUserId: user?.id ?? '',
                                    isMobile: isMobile,
                                    selectedChannelId: _selectedChannelId,
                                    onChannelSelect: (id) => setState(() => _selectedChannelId = id),
                                  ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const VoiceCallBar(),
        ],
      ),
    );
  }
}

class _MobileDrawer extends ConsumerWidget {
  const _MobileDrawer({
    required this.selectedServer,
    required this.selectedChannelId,
    required this.friendsSelected,
    required this.onServerSelect,
    required this.onFriendsSelect,
    required this.onChannelSelect,
  });

  final RelayServer? selectedServer;
  final String? selectedChannelId;
  final bool friendsSelected;
  final ValueChanged<RelayServer> onServerSelect;
  final VoidCallback onFriendsSelect;
  final ValueChanged<String> onChannelSelect;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    return Drawer(
      backgroundColor: relay.background,
      child: Row(
        children: [
          ServerRail(
            selectedServerId: selectedServer?.id,
            friendsSelected: friendsSelected,
            onSelect: onServerSelect,
            onSelectFriends: onFriendsSelect,
          ),
          Container(width: 1, color: relay.border),
          Expanded(
            child: selectedServer == null
                ? Container(color: relay.surfaceAlt) // Vazio se não tem servidor selecionado
                : Consumer(
                    builder: (context, ref, _) {
                      // Busca a lista de canais do servidor atual direto do provedor
                      final detailAsync = ref.watch(serverDetailProvider(selectedServer!.id));
                      return detailAsync.when(
                        loading: () => const Center(child: CircularProgressIndicator()),
                        error: (e, st) => const SizedBox(),
                        data: (server) => ChannelSidebar(
                          server: server,
                          selectedChannelId: selectedChannelId,
                          onSelect: (channel) {
                            onChannelSelect(channel.id);
                            Scaffold.of(context).closeDrawer(); // Fecha o menu ao clicar num canal
                          },
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _TopBar extends ConsumerWidget {
  const _TopBar({required this.user, required this.isMobile});

  final CurrentUser? user;
  final bool isMobile;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    final realtimeState = ref.watch(realtimeClientProvider).state;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        children: [
          // BOTÃO HAMBÚRGUER (SÓ APARECE NO CELULAR)
          if (isMobile) ...[
            IconButton(
              icon: Icon(Icons.menu, color: relay.ink),
              onPressed: () => Scaffold.of(context).openDrawer(),
            ),
            const SizedBox(width: 8),
          ],
          CircleAvatar(
            radius: 18,
            backgroundColor: relay.accent,
            backgroundImage: user?.avatarUrl != null ? NetworkImage(user!.avatarUrl!) : null,
            child: user?.avatarUrl == null
                ? Text(
                    (user?.displayName ?? '?').substring(0, 1).toUpperCase(),
                    style: TextStyle(color: relay.accentInk, fontWeight: FontWeight.w700, fontSize: 14),
                  )
                : null,
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(user?.displayName ?? '', style: Theme.of(context).textTheme.titleMedium),
              Text('@${user?.username ?? ''}', style: TextStyle(color: relay.inkFaint, fontSize: 12)),
            ],
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: Icon(Icons.settings, color: relay.inkFaint, size: 20),
            tooltip: 'Configurações de Usuário',
            onPressed: () {
              showDialog(
                context: context,
                builder: (context) => UserProfileDialog(
                  currentDisplayName: user?.displayName ?? 'Usuário',
                  currentAvatarUrl: user?.avatarUrl,
                ),
              );
            },
          ),
          const Spacer(),
          ValueListenableBuilder<RealtimeConnectionState>(
            valueListenable: realtimeState,
            builder: (context, state, _) => _ConnectionBadge(state: state),
          ),
          const SizedBox(width: 12),
          OutlinedButton.icon(
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
            icon: const Icon(Icons.logout, size: 18),
            label: const Text('Sair'),
          ),
        ],
      ),
    );
  }
}

class _ConnectionBadge extends StatelessWidget {
  const _ConnectionBadge({required this.state});

  final RealtimeConnectionState state;

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    final (color, label) = switch (state) {
      RealtimeConnectionState.connected => (relay.good, 'Em tempo real'),
      RealtimeConnectionState.connecting => (relay.warn, 'Conectando…'),
      RealtimeConnectionState.disconnected => (relay.critical, 'Desconectado'),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(100),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _WelcomeBody extends StatelessWidget {
  const _WelcomeBody();

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.forum_outlined, size: 40, color: relay.inkFaint),
          const SizedBox(height: 12),
          Text(
            'Selecione um servidor à esquerda, ou crie um novo com o botão "+".',
            style: Theme.of(context).textTheme.bodyLarge,
          ),
        ],
      ),
    );
  }
}

class _ServerBody extends ConsumerStatefulWidget {
  const _ServerBody({
    super.key,
    required this.server,
    required this.currentUserId,
    required this.isMobile,
    required this.selectedChannelId,
    required this.onChannelSelect,
  });

  final RelayServer server;
  final String currentUserId;
  final bool isMobile;
  final String? selectedChannelId;
  final ValueChanged<String> onChannelSelect;

  @override
  ConsumerState<_ServerBody> createState() => _ServerBodyState();
}

class _ServerBodyState extends ConsumerState<_ServerBody> {
  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    final detailAsync = ref.watch(serverDetailProvider(widget.server.id));

    return detailAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(
        child: Text('Não deu para carregar este servidor.', style: TextStyle(color: relay.critical)),
      ),
      data: (server) {
        // SELEÇÃO AUTOMÁTICA DO PRIMEIRO CANAL
        if (widget.selectedChannelId == null) {
          final ordered = server.orderedChannels;
          final firstChannel = ordered.isNotEmpty ? ordered.first : null;
          if (firstChannel != null) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) widget.onChannelSelect(firstChannel.id);
            });
          }
        }

        final matches = server.channels.where((c) => c.id == widget.selectedChannelId);
        final selected = matches.isEmpty ? null : matches.first;

        return Row(
          children: [
            // ESCONDE A SIDEBAR SE FOR CELULAR (ELA JÁ ESTÁ NO DRAWER AGORA)
            if (!widget.isMobile) ...[
              ChannelSidebar(
                server: server,
                selectedChannelId: widget.selectedChannelId,
                onSelect: (channel) => widget.onChannelSelect(channel.id),
              ),
              Container(width: 1, color: relay.border),
            ],
            Expanded(
              child: selected == null
                  ? Center(
                      child: Text('Este servidor ainda não tem canais.',
                          style: TextStyle(color: relay.inkFaint)),
                    )
                  : selected.type == ChannelKind.text
                      ? ChannelScreen(
                          key: ValueKey(selected.id),
                          channel: selected,
                          currentUserId: widget.currentUserId,
                        )
                      : VoiceChannelScreen(
                          key: ValueKey(selected.id),
                          channel: selected,
                        ),
            ),
            if (!widget.isMobile) ...[
              Container(width: 1, color: relay.border),
              MemberListPanel(members: server.members),
            ],
          ],
        );
      },
    );
  }
}