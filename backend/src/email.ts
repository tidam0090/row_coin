import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER || 'noreply@coinrow.app';
const FROM_NAME = process.env.FROM_NAME || 'Coin Row';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    if (!SMTP_USER || !SMTP_PASS) {
      throw new Error('SMTP credentials are not configured');
    }
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  return transporter;
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const mailer = getTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Reset your Coin Row password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; padding: 40px; max-width: 600px;">
                <tr>
                  <td>
                    <h1 style="margin: 0 0 20px 0; font-size: 24px; color: #1a1a2e; font-weight: bold;">Coin Row</h1>
                    <h2 style="margin: 0 0 24px 0; font-size: 20px; color: #333333; font-weight: normal;">Reset your password</h2>
                    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #555555;">
                      We received a request to reset the password for your Coin Row account.
                      Click the button below to choose a new password.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 32px 0;">
                      <tr>
                        <td>
                          <a href="${resetLink}" style="display: inline-block; background-color: #f1c40f; color: #000000; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">
                            Reset password
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #555555;">
                      This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.
                    </p>
                    <p style="margin: 32px 0 0 0; font-size: 13px; color: #999999; line-height: 1.5;">
                      Coin Row Team<br>
                      <span style="color: #bbbbbb;">This is an automated message. Please do not reply to this email.</span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `Coin Row - Reset your password

We received a request to reset the password for your Coin Row account.

Click this link to reset your password:
${resetLink}

This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.

Coin Row Team`;

  const info = await mailer.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    replyTo: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject: 'Reset your Coin Row password',
    text,
    html,
    headers: {
      'X-Mailer': 'Coin Row',
      'X-Priority': '3',
      'X-MSMail-Priority': 'Normal',
      'Importance': 'Normal',
    },
  });

  console.log(`[PASSWORD RESET] Email sent successfully to ${to}. MessageId: ${info.messageId}`);
  return info;
}
