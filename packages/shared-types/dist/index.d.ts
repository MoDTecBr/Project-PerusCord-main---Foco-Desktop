export declare enum ChannelType {
    TEXT = "TEXT",
    VOICE = "VOICE",
    VIDEO = "VIDEO",
    DM = "DM"
}
export declare enum PresenceStatus {
    ONLINE = "ONLINE",
    IDLE = "IDLE",
    DO_NOT_DISTURB = "DO_NOT_DISTURB",
    OFFLINE = "OFFLINE"
}
export declare enum AuditLogAction {
    MEMBER_KICK = "MEMBER_KICK",
    MEMBER_BAN = "MEMBER_BAN",
    MEMBER_ROLE_UPDATE = "MEMBER_ROLE_UPDATE",
    ROLE_CREATE = "ROLE_CREATE",
    ROLE_UPDATE = "ROLE_UPDATE",
    ROLE_DELETE = "ROLE_DELETE",
    CHANNEL_CREATE = "CHANNEL_CREATE",
    CHANNEL_UPDATE = "CHANNEL_UPDATE",
    CHANNEL_DELETE = "CHANNEL_DELETE",
    CATEGORY_CREATE = "CATEGORY_CREATE",
    CATEGORY_DELETE = "CATEGORY_DELETE",
    INVITE_CREATE = "INVITE_CREATE",
    INVITE_DELETE = "INVITE_DELETE",
    SERVER_UPDATE = "SERVER_UPDATE"
}
export interface PublicUser {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
}
export interface AuthTokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export declare const RealtimeEvent: {
    readonly PRESENCE_SET: "presence:set";
    readonly TYPING_START: "typing:start";
    readonly TYPING_STOP: "typing:stop";
    readonly PRESENCE_UPDATE: "presence:update";
    readonly MESSAGE_CREATE: "message:create";
    readonly MESSAGE_UPDATE: "message:update";
    readonly MESSAGE_DELETE: "message:delete";
    readonly MEMBER_JOIN: "member:join";
    readonly FRIEND_REQUEST_CREATE: "friend:request:create";
    readonly FRIEND_REQUEST_UPDATE: "friend:request:update";
    readonly CHANNEL_CREATE: "channel:create";
    readonly CHANNEL_UPDATE: "channel:update";
    readonly CHANNEL_DELETE: "channel:delete";
    readonly CATEGORY_CREATE: "category:create";
    readonly CATEGORY_DELETE: "category:delete";
};
export interface PresenceUpdatePayload {
    userId: string;
    status: PresenceStatus;
}
export interface TypingPayload {
    channelId: string;
    userId: string;
}
