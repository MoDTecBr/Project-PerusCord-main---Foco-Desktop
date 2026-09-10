"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_PERMISSIONS = exports.DEFAULT_EVERYONE_PERMISSIONS = exports.Permission = void 0;
exports.hasPermission = hasPermission;
exports.addPermission = addPermission;
exports.removePermission = removePermission;
exports.applyOverwrite = applyOverwrite;
exports.permissionsToBitfield = permissionsToBitfield;
exports.bitfieldToPermissions = bitfieldToPermissions;
exports.Permission = {
    VIEW_CHANNELS: 1n << 0n,
    MANAGE_CHANNELS: 1n << 1n,
    MANAGE_ROLES: 1n << 2n,
    MANAGE_SERVER: 1n << 3n,
    CREATE_INVITE: 1n << 4n,
    CHANGE_NICKNAME: 1n << 5n,
    MANAGE_NICKNAMES: 1n << 6n,
    KICK_MEMBERS: 1n << 7n,
    BAN_MEMBERS: 1n << 8n,
    SEND_MESSAGES: 1n << 9n,
    MANAGE_MESSAGES: 1n << 10n,
    ATTACH_FILES: 1n << 11n,
    READ_MESSAGE_HISTORY: 1n << 12n,
    MENTION_EVERYONE: 1n << 13n,
    ADD_REACTIONS: 1n << 14n,
    CONNECT: 1n << 15n,
    SPEAK: 1n << 16n,
    VIDEO: 1n << 17n,
    SHARE_SCREEN: 1n << 18n,
    MUTE_MEMBERS: 1n << 19n,
    DEAFEN_MEMBERS: 1n << 20n,
    MOVE_MEMBERS: 1n << 21n,
    MANAGE_WEBHOOKS: 1n << 22n,
    MANAGE_BOTS: 1n << 23n,
    VIEW_AUDIT_LOG: 1n << 24n,
    ADMINISTRATOR: 1n << 62n,
};
exports.DEFAULT_EVERYONE_PERMISSIONS = exports.Permission.VIEW_CHANNELS |
    exports.Permission.CREATE_INVITE |
    exports.Permission.CHANGE_NICKNAME |
    exports.Permission.SEND_MESSAGES |
    exports.Permission.ATTACH_FILES |
    exports.Permission.READ_MESSAGE_HISTORY |
    exports.Permission.ADD_REACTIONS |
    exports.Permission.CONNECT |
    exports.Permission.SPEAK |
    exports.Permission.VIDEO |
    exports.Permission.SHARE_SCREEN;
exports.ALL_PERMISSIONS = Object.values(exports.Permission).reduce((acc, bit) => acc | bit, 0n);
function hasPermission(bitfield, permission) {
    if ((bitfield & exports.Permission.ADMINISTRATOR) === exports.Permission.ADMINISTRATOR) {
        return true;
    }
    return (bitfield & permission) === permission;
}
function addPermission(bitfield, permission) {
    return bitfield | permission;
}
function removePermission(bitfield, permission) {
    return bitfield & ~permission;
}
function applyOverwrite(base, allow, deny) {
    return (base | allow) & ~deny;
}
function permissionsToBitfield(names) {
    return names.reduce((acc, name) => acc | exports.Permission[name], 0n);
}
function bitfieldToPermissions(bitfield) {
    return Object.keys(exports.Permission).filter((name) => hasPermission(bitfield, exports.Permission[name]));
}
//# sourceMappingURL=index.js.map