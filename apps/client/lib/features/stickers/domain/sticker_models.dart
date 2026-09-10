import '../../messages/domain/message_models.dart';

class Sticker {
  const Sticker({
    required this.id,
    required this.url,
    required this.mimeType,
    required this.size,
    this.name,
  });

  final String id;
  final String url;
  final String mimeType;
  final int size;
  final String? name;

  factory Sticker.fromJson(Map<String, dynamic> json) => Sticker(
        id: json['id'] as String,
        url: json['url'] as String,
        mimeType: json['mimeType'] as String,
        size: json['size'] as int,
        name: json['name'] as String?,
      );

  /// Enviar uma figurinha reaproveita o mesmo mecanismo de anexo de imagem
  /// já usado pelo chat — não precisa de um tipo de mensagem novo.
  MessageAttachment toAttachment() => MessageAttachment(
        url: url,
        filename: name ?? 'sticker',
        size: size,
        mimeType: mimeType,
      );
}
