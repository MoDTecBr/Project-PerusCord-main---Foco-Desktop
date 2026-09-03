class RelayServer {
  const RelayServer({
    required this.id,
    required this.name,
    required this.description,
    required this.iconUrl,
    required this.ownerId,
  });

  final String id;
  final String name;
  final String? description;
  final String? iconUrl;
  final String ownerId;

  factory RelayServer.fromJson(Map<String, dynamic> json) => RelayServer(
        id: json['id'] as String,
        name: json['name'] as String,
        description: json['description'] as String?,
        iconUrl: json['iconUrl'] as String?,
        ownerId: json['ownerId'] as String,
      );

  /// Iniciais para o avatar de fallback (sem `iconUrl`), tipo "SC" para
  /// "Servidor de Chat" — mesmo truque visual do Discord/Slack.
  String get initials {
    final words = name.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
    if (words.isEmpty) return '?';
    if (words.length == 1) return words.first.substring(0, 1).toUpperCase();
    return (words.first.substring(0, 1) + words[1].substring(0, 1)).toUpperCase();
  }
}
