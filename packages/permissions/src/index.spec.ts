import {
  ALL_PERMISSIONS,
  applyOverwrite,
  DEFAULT_EVERYONE_PERMISSIONS,
  Permission,
  addPermission,
  hasPermission,
  removePermission,
} from './index';

describe('permissions bitfield', () => {
  it('detects a directly granted permission', () => {
    const bitfield = Permission.SEND_MESSAGES | Permission.VIEW_CHANNELS;
    expect(hasPermission(bitfield, Permission.SEND_MESSAGES)).toBe(true);
    expect(hasPermission(bitfield, Permission.MANAGE_SERVER)).toBe(false);
  });

  it('ADMINISTRATOR bypasses every other permission check', () => {
    expect(hasPermission(Permission.ADMINISTRATOR, Permission.BAN_MEMBERS)).toBe(true);
    expect(hasPermission(Permission.ADMINISTRATOR, ALL_PERMISSIONS)).toBe(true);
  });

  it('add/removePermission toggle a single bit without touching others', () => {
    let bitfield = Permission.VIEW_CHANNELS;
    bitfield = addPermission(bitfield, Permission.SEND_MESSAGES);
    expect(hasPermission(bitfield, Permission.SEND_MESSAGES)).toBe(true);
    expect(hasPermission(bitfield, Permission.VIEW_CHANNELS)).toBe(true);

    bitfield = removePermission(bitfield, Permission.VIEW_CHANNELS);
    expect(hasPermission(bitfield, Permission.VIEW_CHANNELS)).toBe(false);
    expect(hasPermission(bitfield, Permission.SEND_MESSAGES)).toBe(true);
  });

  it('deny in an overwrite always wins over allow', () => {
    const base = DEFAULT_EVERYONE_PERMISSIONS;
    const result = applyOverwrite(base, Permission.MANAGE_CHANNELS, Permission.SEND_MESSAGES);
    expect(hasPermission(result, Permission.MANAGE_CHANNELS)).toBe(true);
    expect(hasPermission(result, Permission.SEND_MESSAGES)).toBe(false);
  });

  it('everyone role cannot manage the server by default', () => {
    expect(hasPermission(DEFAULT_EVERYONE_PERMISSIONS, Permission.MANAGE_SERVER)).toBe(false);
    expect(hasPermission(DEFAULT_EVERYONE_PERMISSIONS, Permission.BAN_MEMBERS)).toBe(false);
  });
});
