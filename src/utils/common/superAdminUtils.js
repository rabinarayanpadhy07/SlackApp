import { SUPER_ADMIN_EMAILS } from '../../config/ServerConfig.js';

export const shouldGrantSuperAdmin = (email) =>
  SUPER_ADMIN_EMAILS.includes((email || '').trim().toLowerCase());

export const applySuperAdminDefaults = (user) => {
  if (!user) return user;

  if (shouldGrantSuperAdmin(user.email)) {
    user.isSuperAdmin = true;
  }

  return user;
};
