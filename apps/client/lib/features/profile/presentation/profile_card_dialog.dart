import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/user_avatar.dart';
import '../application/profile_controller.dart';
import '../domain/user_profile.dart';

const _months = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

String _formatJoinDate(DateTime date) => '${date.day} de ${_months[date.month - 1]} de ${date.year}';

/// Mostra o card de perfil de qualquer usuário (mesmo padrão do
/// UserProfileDialog pra edição, mas somente leitura) — chamado ao clicar
/// no avatar/nome de alguém no chat, lista de membros, etc.
void showProfileCard(BuildContext context, String userId) {
  showDialog<void>(
    context: context,
    builder: (context) => ProfileCardDialog(userId: userId),
  );
}

class ProfileCardDialog extends ConsumerWidget {
  const ProfileCardDialog({super.key, required this.userId});

  final String userId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    final profileAsync = ref.watch(userProfileProvider(userId));

    return Dialog(
      backgroundColor: relay.surfaceAlt,
      surfaceTintColor: Colors.transparent,
      child: SizedBox(
        width: 360,
        child: profileAsync.when(
          data: (profile) => _ProfileCardContent(profile: profile, relay: relay),
          loading: () => const SizedBox(
            height: 260,
            child: Center(child: CircularProgressIndicator()),
          ),
          error: (error, _) => SizedBox(
            height: 160,
            child: Center(
              child: Text('Não foi possível carregar esse perfil.',
                  style: TextStyle(color: relay.critical, fontSize: 13)),
            ),
          ),
        ),
      ),
    );
  }
}

class _ProfileCardContent extends StatelessWidget {
  const _ProfileCardContent({required this.profile, required this.relay});

  final UserProfile profile;
  final AppPalette relay;

  @override
  Widget build(BuildContext context) {
    final bannerUrl = profile.bannerUrl;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              child: bannerUrl != null && bannerUrl.isNotEmpty
                  ? Image.network(
                      bannerUrl,
                      height: 100,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stack) => Container(height: 100, color: relay.accent),
                    )
                  : Container(height: 100, color: relay.accent),
            ),
            Positioned(
              left: 16,
              top: 68,
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(color: relay.surfaceAlt, shape: BoxShape.circle),
                child: UserAvatar(
                  displayName: profile.displayName,
                  avatarUrl: profile.avatarUrl,
                  radius: 40,
                ),
              ),
            ),
            if (profile.isOnline)
              Positioned(
                left: 16 + 64,
                top: 68 + 64,
                child: Container(
                  width: 18,
                  height: 18,
                  decoration: BoxDecoration(
                    color: relay.good,
                    shape: BoxShape.circle,
                    border: Border.all(color: relay.surfaceAlt, width: 3),
                  ),
                ),
              ),
            Positioned(
              right: 4,
              top: 4,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white, size: 18),
                style: IconButton.styleFrom(backgroundColor: Colors.black26),
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ],
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 40, 16, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(profile.displayName,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              Text('@${profile.username}', style: TextStyle(color: relay.inkFaint, fontSize: 13)),
              if (profile.customStatus != null && profile.customStatus!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(profile.customStatus!, style: TextStyle(color: relay.ink, fontSize: 13)),
              ],
              if (profile.bio != null && profile.bio!.isNotEmpty) ...[
                const SizedBox(height: 16),
                Container(height: 1, color: relay.border),
                const SizedBox(height: 12),
                Text('SOBRE MIM',
                    style: TextStyle(
                        color: relay.inkFaint, fontSize: 11, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Text(profile.bio!, style: TextStyle(color: relay.ink, fontSize: 13)),
              ],
              const SizedBox(height: 16),
              Container(height: 1, color: relay.border),
              const SizedBox(height: 12),
              Text('MEMBRO DESDE',
                  style:
                      TextStyle(color: relay.inkFaint, fontSize: 11, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(_formatJoinDate(profile.createdAt),
                  style: TextStyle(color: relay.ink, fontSize: 13)),
            ],
          ),
        ),
      ],
    );
  }
}
