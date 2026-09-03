import '../../friends/domain/friend_models.dart';

class DmConversation {
  const DmConversation({required this.channelId, required this.participant});

  final String channelId;
  final FriendUser? participant;

  factory DmConversation.fromJson(Map<String, dynamic> json) => DmConversation(
        channelId: json['id'] as String,
        participant: json['participant'] != null
            ? FriendUser.fromJson(json['participant'] as Map<String, dynamic>)
            : null,
      );
}
