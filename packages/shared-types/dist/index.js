"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeEvent = exports.AuditLogAction = exports.PresenceStatus = exports.ChannelType = void 0;
var ChannelType;
(function (ChannelType) {
    ChannelType["TEXT"] = "TEXT";
    ChannelType["VOICE"] = "VOICE";
    ChannelType["VIDEO"] = "VIDEO";
    ChannelType["DM"] = "DM";
})(ChannelType || (exports.ChannelType = ChannelType = {}));
var PresenceStatus;
(function (PresenceStatus) {
    PresenceStatus["ONLINE"] = "ONLINE";
    PresenceStatus["IDLE"] = "IDLE";
    PresenceStatus["DO_NOT_DISTURB"] = "DO_NOT_DISTURB";
    PresenceStatus["OFFLINE"] = "OFFLINE";
})(PresenceStatus || (exports.PresenceStatus = PresenceStatus = {}));
var AuditLogAction;
(function (AuditLogAction) {
    AuditLogAction["MEMBER_KICK"] = "MEMBER_KICK";
    AuditLogAction["MEMBER_BAN"] = "MEMBER_BAN";
    AuditLogAction["MEMBER_ROLE_UPDATE"] = "MEMBER_ROLE_UPDATE";
    AuditLogAction["ROLE_CREATE"] = "ROLE_CREATE";
    AuditLogAction["ROLE_UPDATE"] = "ROLE_UPDATE";
    AuditLogAction["ROLE_DELETE"] = "ROLE_DELETE";
    AuditLogAction["CHANNEL_CREATE"] = "CHANNEL_CREATE";
    AuditLogAction["CHANNEL_UPDATE"] = "CHANNEL_UPDATE";
    AuditLogAction["CHANNEL_DELETE"] = "CHANNEL_DELETE";
    AuditLogAction["CATEGORY_CREATE"] = "CATEGORY_CREATE";
    AuditLogAction["CATEGORY_DELETE"] = "CATEGORY_DELETE";
    AuditLogAction["INVITE_CREATE"] = "INVITE_CREATE";
    AuditLogAction["INVITE_DELETE"] = "INVITE_DELETE";
    AuditLogAction["SERVER_UPDATE"] = "SERVER_UPDATE";
})(AuditLogAction || (exports.AuditLogAction = AuditLogAction = {}));
exports.RealtimeEvent = {
    PRESENCE_SET: 'presence:set',
    TYPING_START: 'typing:start',
    TYPING_STOP: 'typing:stop',
    PRESENCE_UPDATE: 'presence:update',
    MESSAGE_CREATE: 'message:create',
    MESSAGE_UPDATE: 'message:update',
    MESSAGE_DELETE: 'message:delete',
    MEMBER_JOIN: 'member:join',
    FRIEND_REQUEST_CREATE: 'friend:request:create',
    FRIEND_REQUEST_UPDATE: 'friend:request:update',
    CHANNEL_CREATE: 'channel:create',
    CHANNEL_UPDATE: 'channel:update',
    CHANNEL_DELETE: 'channel:delete',
    CATEGORY_CREATE: 'category:create',
    CATEGORY_DELETE: 'category:delete',
};
//# sourceMappingURL=index.js.map