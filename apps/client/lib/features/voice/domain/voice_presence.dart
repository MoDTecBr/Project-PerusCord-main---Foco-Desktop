class VoicePresenceParticipant {
  const VoicePresenceParticipant({
    required this.identity,
    required this.name,
    required this.isSharingScreen,
    required this.joinedAt,
  });

  final String identity;
  final String name;
  final bool isSharingScreen;
  final DateTime joinedAt;

  factory VoicePresenceParticipant.fromJson(Map<String, dynamic> json) => VoicePresenceParticipant(
        identity: json['identity'] as String,
        name: json['name'] as String,
        isSharingScreen: json['isSharingScreen'] as bool? ?? false,
        joinedAt: DateTime.fromMillisecondsSinceEpoch(json['joinedAtMs'] as int? ?? 0),
      );
}
