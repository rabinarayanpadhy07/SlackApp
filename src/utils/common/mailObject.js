import { APP_LINK, FRONTEND_URL, MAIL_ID } from '../../config/serverConfig.js';

export const workspaceJoinMail = function (workspace) {
  return {
    from: MAIL_ID,
    subject: 'You have been added to a workspace',
    text: `Congratulations! You have been added to the workspace ${workspace.name}`
  };
};

export const verifyEmailMail = function (verificationToken) {
  return {
    from: MAIL_ID,
    subject: 'Welcome to the app. Please verify your email',
    text: `
      Welcome to the app. Please verify your email by clicking on the link below:
     ${APP_LINK}/verify/${verificationToken}
    `
  };
};

export const forgotPasswordMail = function (resetToken) {
  const resetUrl = `${FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

  return {
    from: MAIL_ID,
    subject: 'Reset your SlackApp password',
    text: `
      We received a request to reset your SlackApp password.

      Reset your password:
      ${resetUrl}

      This link expires in 1 hour.

      If you did not request this reset, you can safely ignore this email and your password will stay the same.
    `,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2 style="color: #611f69;">Reset your SlackApp password</h2>
        <p>We received a request to reset your password.</p>
        <p>
          <a
            href="${resetUrl}"
            style="display: inline-block; background: #611f69; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 600;"
          >
            Reset password
          </a>
        </p>
        <p>If the button does not work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">${resetUrl}</p>
        <p><strong>This link expires in 1 hour.</strong></p>
        <p>If you did not request this reset, you can safely ignore this email and your password will stay the same.</p>
      </div>
    `
  };
};
