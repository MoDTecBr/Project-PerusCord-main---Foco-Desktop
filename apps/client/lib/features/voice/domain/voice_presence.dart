class VoicePresenceParticipant {
  const VoicePresenceParticipant({
    required this.identity,
    required this.name,
    required this.avatarUrl,
    required this.isSharingScreen,
    required this.isMuted,
    required this.joinedAt,
  });

  final String identity;
  final String name;
  final String? avatarUrl;
  final bool isSharingScreen;
  final bool isMuted;
  final DateTime joinedAt;

  factory VoicePresenceParticipant.fromJson(Map<String, dynamic> json) => VoicePresenceParticipant(
        identity: json['identity'] as String,
        name: json['name'] as String,
        avatarUrl: json['avatarUrl'] as String?,
        isSharingScreen: json['isSharingScreen'] as bool? ?? false,
        isMuted: json['isMuted'] as bool? ?? false,
        joinedAt: DateTime.fromMillisecondsSinceEpoch(json['joinedAtMs'] as int? ?? 0),
      );
}
