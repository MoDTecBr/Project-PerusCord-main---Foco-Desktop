import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Avatar com foto de perfil quando existe, caindo pra inicial do nome
/// quando não — centraliza essa checagem pra não repetir em cada tela que
/// mostra outros usuários (mensagens, amigos, membros, presença de voz).
class UserAvatar extends StatelessWidget {
  const UserAvatar({
    super.key,
    required this.displayName,
    this.avatarUrl,
    this.radius = 18,
    this.backgroundColor,
    this.foregroundColor,
  });

  final String displayName;
  final String? avatarUrl;
  final double radius;
  final Color? backgroundColor;
  final Color? foregroundColor;

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    final url = avatarUrl;
    final hasPhoto = url != null && url.isNotEmpty;

    return CircleAvatar(
      radius: radius,
      backgroundColor: backgroundColor ?? relay.wire,
      backgroundImage: hasPhoto ? NetworkImage(url) : null,
      child: hasPhoto
          ? null
          : Text(
              displayName.isNotEmpty ? displayName.substring(0, 1).toUpperCase() : '?',
              style: TextStyle(
                color: foregroundColor ?? relay.background,
                fontWeight: FontWeight.w700,
                fontSize: radius * 0.7,
              ),
            ),
    );
  }
}
