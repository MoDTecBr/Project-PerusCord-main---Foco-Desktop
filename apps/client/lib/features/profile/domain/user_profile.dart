/// Card de perfil de QUALQUER usuário (não só o dono da sessão) — nunca
/// carrega campos privados como email/mfaEnabled, que o backend já filtra
/// em `GET /users/:id` (ver `PROFILE_CARD_SELECT` no `users.service.ts`).
class UserProfile {
  const UserProfile({
    required this.id,
    required this.username,
    required this.displayName,
    required this.avatarUrl,
    required this.bannerUrl,
    required this.bio,
    required this.customStatus,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String username;
  final String displayName;
  final String? avatarUrl;
  final String? bannerUrl;
  final String? bio;
  final String? customStatus;
  final String status;
  final DateTime createdAt;

  bool get isOnline => status != 'OFFLINE';

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
        id: json['id'] as String,
        username: json['username'] as String,
        displayName: json['displayName'] as String,
        avatarUrl: json['avatarUrl'] as String?,
        bannerUrl: json['bannerUrl'] as String?,
        bio: json['bio'] as String?,
        customStatus: json['customStatus'] as String?,
        status: json['status'] as String? ?? 'OFFLINE',
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}
