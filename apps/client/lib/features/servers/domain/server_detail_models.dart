/// Tipos de canal — espelha o enum `ChannelType` do backend
/// (`packages/shared-types` / `schema.prisma`).
enum ChannelKind { text, voice, video, dm }

ChannelKind channelKindFromApi(String raw) => switch (raw) {
      'TEXT' => ChannelKind.text,
      'VOICE' => ChannelKind.voice,
      'VIDEO' => ChannelKind.video,
      'DM' => ChannelKind.dm,
      _ => ChannelKind.text,
    };

class RelayChannel {
  const RelayChannel({
    required this.id,
    required this.name,
    required this.type,
    required this.categoryId,
    required this.position,
    required this.topic,
  });

  final String id;
  final String name;
  final ChannelKind type;
  final String? categoryId;
  final int position;
  final String? topic;

  factory RelayChannel.fromJson(Map<String, dynamic> json) => RelayChannel(
        id: json['id'] as String,
        name: json['name'] as String,
        type: channelKindFromApi(json['type'] as String),
        categoryId: json['categoryId'] as String?,
        position: json['position'] as int? ?? 0,
        topic: json['topic'] as String?,
      );
}

class RelayCategory {
  const RelayCategory({required this.id, required this.name, required this.position});

  final String id;
  final String name;
  final int position;

  factory RelayCategory.fromJson(Map<String, dynamic> json) => RelayCategory(
        id: json['id'] as String,
        name: json['name'] as String,
        position: json['position'] as int? ?? 0,
      );
}

/// Uma linha de `members` no detalhe do servidor — já achata `member.user`,
/// que é onde o backend (`SERVER_DETAIL_INCLUDE` em `servers.service.ts`)
/// realmente coloca nome/avatar/status.
class RelayMember {
  const RelayMember({
    required this.userId,
    required this.username,
    required this.displayName,
    required this.avatarUrl,
    required this.status,
  });

  final String userId;
  final String username;
  final String displayName;
  final String? avatarUrl;
  final String status;

  bool get isOnline => status != 'OFFLINE';

  factory RelayMember.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>;
    return RelayMember(
      userId: user['id'] as String,
      username: user['username'] as String,
      displayName: user['displayName'] as String,
      avatarUrl: user['avatarUrl'] as String?,
      status: user['status'] as String? ?? 'OFFLINE',
    );
  }
}

class ServerDetail {
  const ServerDetail({
    required this.id,
    required this.name,
    required this.description,
    required this.ownerId,
    required this.categories,
    required this.channels,
    required this.members,
  });

  final String id;
  final String name;
  final String? description;
  final String ownerId;
  final List<RelayCategory> categories;
  final List<RelayChannel> channels;
  final List<RelayMember> members;

  factory ServerDetail.fromJson(Map<String, dynamic> json) => ServerDetail(
        id: json['id'] as String,
        name: json['name'] as String,
        description: json['description'] as String?,
        ownerId: json['ownerId'] as String,
        categories: (json['categories'] as List<dynamic>? ?? [])
            .map((c) => RelayCategory.fromJson(c as Map<String, dynamic>))
            .toList()
          ..sort((a, b) => a.position.compareTo(b.position)),
        channels: (json['channels'] as List<dynamic>? ?? [])
            .map((c) => RelayChannel.fromJson(c as Map<String, dynamic>))
            .toList()
          ..sort((a, b) => a.position.compareTo(b.position)),
        members: (json['members'] as List<dynamic>? ?? [])
            .map((m) => RelayMember.fromJson(m as Map<String, dynamic>))
            .toList()
          ..sort((a, b) => a.displayName.toLowerCase().compareTo(b.displayName.toLowerCase())),
      );

  /// Canais sem categoria, seguidos de cada categoria com os seus — a mesma
  /// ordem de exibição que Discord/Slack usam.
  List<RelayChannel> channelsIn(String? categoryId) =>
      channels.where((c) => c.categoryId == categoryId).toList();

  /// Achata a mesma ordem visual da sidebar (sem categoria → cada categoria
  /// em ordem) — `position` só é único DENTRO de um grupo, então ordenar
  /// `channels` inteiro por posição não reproduz a ordem que aparece na tela.
  List<RelayChannel> get orderedChannels => [
        ...channelsIn(null),
        for (final category in categories) ...channelsIn(category.id),
      ];
}
