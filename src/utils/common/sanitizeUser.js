export const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  const safeUser =
    typeof user.toObject === 'function' ? user.toObject() : { ...user };

  delete safeUser.password;
  delete safeUser.verificationToken;
  delete safeUser.verificationTokenExpiry;
  delete safeUser.passwordResetToken;
  delete safeUser.passwordResetTokenExpiry;
  delete safeUser.twoFactorSecret;
  delete safeUser.googleId;
  delete safeUser.__v;

  return safeUser;
};
