class AuthTokens {
  const AuthTokens({required this.accessToken, required this.refreshToken, required this.expiresIn});

  final String accessToken;
  final String refreshToken;
  final int expiresIn;

  factory AuthTokens.fromJson(Map<String, dynamic> json) => AuthTokens(
        accessToken: json['accessToken'] as String,
        refreshToken: json['refreshToken'] as String,
        expiresIn: json['expiresIn'] as int,
      );
}

class CurrentUser {
  const CurrentUser({
    required this.id,
    required this.username,
    required this.displayName,
    required this.email,
    required this.avatarUrl,
    required this.status,
    required this.mfaEnabled,
  });

  final String id;
  final String username;
  final String displayName;
  final String email;
  final String? avatarUrl;
  final String status;
  final bool mfaEnabled;

  factory CurrentUser.fromJson(Map<String, dynamic> json) => CurrentUser(
        id: json['id'] as String,
        username: json['username'] as String,
        displayName: json['displayName'] as String,
        email: json['email'] as String,
        avatarUrl: json['avatarUrl'] as String?,
        status: json['status'] as String? ?? 'OFFLINE',
        mfaEnabled: json['mfaEnabled'] as bool? ?? false,
      );
}
