class VoiceToken {
  const VoiceToken({required this.token, required this.url, required this.roomName});

  final String token;
  final String url;
  final String roomName;

  factory VoiceToken.fromJson(Map<String, dynamic> json) => VoiceToken(
        token: json['token'] as String,
        url: json['url'] as String,
        roomName: json['roomName'] as String,
      );
}
