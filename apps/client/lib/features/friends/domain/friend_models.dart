class FriendUser {
  const FriendUser({
    required this.id,
    required this.username,
    required this.displayName,
    required this.avatarUrl,
    required this.status,
  });

  final String id;
  final String username;
  final String displayName;
  final String? avatarUrl;
  final String status;

  factory FriendUser.fromJson(Map<String, dynamic> json) => FriendUser(
        id: json['id'] as String,
        username: json['username'] as String,
        displayName: json['displayName'] as String,
        avatarUrl: json['avatarUrl'] as String?,
        status: json['status'] as String? ?? 'OFFLINE',
      );
}

/// Uma linha de `/friends/requests` — para pedidos recebidos vem populado
/// `requester`; para os enviados por mim, `addressee`. `otherUser` já
/// resolve qual dos dois é "a outra pessoa", então a UI nunca precisa saber
/// a diferença.
class FriendRequest {
  const FriendRequest({required this.id, required this.otherUser});

  final String id;
  final FriendUser otherUser;

  factory FriendRequest.fromIncomingJson(Map<String, dynamic> json) => FriendRequest(
        id: json['id'] as String,
        otherUser: FriendUser.fromJson(json['requester'] as Map<String, dynamic>),
      );

  factory FriendRequest.fromOutgoingJson(Map<String, dynamic> json) => FriendRequest(
        id: json['id'] as String,
        otherUser: FriendUser.fromJson(json['addressee'] as Map<String, dynamic>),
      );
}

class PendingFriendRequests {
  const PendingFriendRequests({required this.incoming, required this.outgoing});

  final List<FriendRequest> incoming;
  final List<FriendRequest> outgoing;
}
