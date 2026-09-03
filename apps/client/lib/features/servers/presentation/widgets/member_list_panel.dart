import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/user_avatar.dart';
import '../../domain/server_detail_models.dart';

/// Aba fixa à direita listando quem está no servidor — online primeiro,
/// offline depois, como Discord/Slack.
class MemberListPanel extends StatelessWidget {
  const MemberListPanel({super.key, required this.members});

  final List<RelayMember> members;

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    final online = members.where((m) => m.isOnline).toList();
    final offline = members.where((m) => !m.isOnline).toList();

    return Container(
      width: 232,
      color: relay.surfaceAlt,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 16),
        children: [
          if (online.isNotEmpty) ...[
            _SectionHeader(label: 'ONLINE — ${online.length}'),
            for (final member in online) _MemberTile(member: member),
          ],
          if (offline.isNotEmpty) ...[
            _SectionHeader(label: 'OFFLINE — ${offline.length}'),
            for (final member in offline) _MemberTile(member: member),
          ],
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    return Padding(
      padding: const EdgeInsets.fromLTRB(10, 8, 10, 4),
      child: Text(
        label,
        style: TextStyle(color: relay.inkFaint, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.4),
      ),
    );
  }
}

class _MemberTile extends StatelessWidget {
  const _MemberTile({required this.member});

  final RelayMember member;

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 10),
      child: Opacity(
        opacity: member.isOnline ? 1 : 0.5,
        child: Row(
          children: [
            Stack(
              children: [
                UserAvatar(displayName: member.displayName, avatarUrl: member.avatarUrl, radius: 14),
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                    width: 9,
                    height: 9,
                    decoration: BoxDecoration(
                      color: member.isOnline ? relay.good : relay.inkFaint,
                      shape: BoxShape.circle,
                      border: Border.all(color: relay.surfaceAlt, width: 2),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                member.displayName,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: relay.inkSoft, fontSize: 13.5),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
