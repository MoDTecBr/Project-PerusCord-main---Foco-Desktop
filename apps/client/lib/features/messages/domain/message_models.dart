class MessageAuthor {
  const MessageAuthor({
    required this.id,
    required this.username,
    required this.displayName,
    required this.avatarUrl,
  });

  final String id;
  final String username;
  final String displayName;
  final String? avatarUrl;

  factory MessageAuthor.fromJson(Map<String, dynamic> json) => MessageAuthor(
        id: json['id'] as String,
        username: json['username'] as String,
        displayName: json['displayName'] as String,
        avatarUrl: json['avatarUrl'] as String?,
      );
}

class MessageAttachment {
  const MessageAttachment({
    required this.url,
    required this.filename,
    required this.size,
    required this.mimeType,
  });

  final String url;
  final String filename;
  final int size;
  final String mimeType;

  bool get isImage => mimeType.startsWith('image/');

  factory MessageAttachment.fromJson(Map<String, dynamic> json) => MessageAttachment(
        url: json['url'] as String,
        filename: json['filename'] as String,
        size: json['size'] as int,
        mimeType: json['mimeType'] as String,
      );

  Map<String, dynamic> toJson() => {
        'url': url,
        'filename': filename,
        'size': size,
        'mimeType': mimeType,
      };
}

class RelayMessage {
  const RelayMessage({
    required this.id,
    required this.channelId,
    required this.author,
    required this.content,
    required this.createdAt,
    required this.editedAt,
    required this.attachments,
  });

  final String id;
  final String channelId;
  final MessageAuthor author;
  final String content;
  final DateTime createdAt;
  final DateTime? editedAt;
  final List<MessageAttachment> attachments;

  factory RelayMessage.fromJson(Map<String, dynamic> json) => RelayMessage(
        id: json['id'] as String,
        channelId: json['channelId'] as String,
        author: MessageAuthor.fromJson(json['author'] as Map<String, dynamic>),
        content: json['content'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String),
        editedAt: json['editedAt'] != null ? DateTime.parse(json['editedAt'] as String) : null,
        attachments: (json['attachments'] as List<dynamic>? ?? [])
            .map((a) => MessageAttachment.fromJson(a as Map<String, dynamic>))
            .toList(),
      );

  RelayMessage copyWith({String? content, DateTime? editedAt}) => RelayMessage(
        id: id,
        channelId: channelId,
        author: author,
        content: content ?? this.content,
        createdAt: createdAt,
        editedAt: editedAt ?? this.editedAt,
        attachments: attachments,
      );
}
