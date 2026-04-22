import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const LOGO_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/assets/icons/logo-full.svg.png`
  : 'https://netcareflow.com/assets/icons/logo-full.svg.png';

const SUPPORT_EMAIL = 'support@netcareflow.com';
const PRIVACY_POLICY_URL = 'https://netcareflow.com/privacy';
const NOTIFICATION_SETTINGS_URL = 'https://netcareflow.com/settings';
const UNSUBSCRIBE_URL = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Unsubscribe from NetCare emails')}`;

type EmailFooterType = 'standard' | 'transactional';

const FOOTER_PLACEHOLDER = '<!--EMAIL_FOOTER-->';

function renderEmailFooter(type: EmailFooterType = 'standard') {
  const transactionalNotice = 'You are receiving this mandatory service announcement regarding your scheduled healthcare appointment. These messages are essential for your care and cannot be turned off.';

  return `
    <tr>
      <td style="padding: 20px 30px 0; border-top: 1px solid #e5e7eb;"></td>
    </tr>
    <tr>
      <td style="padding: 0 18px 18px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center; font-family: 'Segoe UI', Arial, sans-serif;">
          <tr>
            <td style="padding: 30px 20px;">
              <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #333;">NetCare Flow Institution</p>
              <p style="margin: 0 0 20px 0; font-size: 12px; color: #777; line-height: 1.5;">123 Medical Plaza, Nairobi, Kenya<br />Questions? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #1a73e8; text-decoration: none;">${SUPPORT_EMAIL}</a></p>
              ${type === 'standard'
                ? `<table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center" style="padding-bottom: 20px;">
                        <a href="${UNSUBSCRIBE_URL}" style="background-color: #ffffff; border: 1px solid #d1d5db; color: #4b5563; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block;">UNSUBSCRIBE FROM THESE EMAILS</a>
                      </td>
                    </tr>
                  </table>`
                : `<p style="margin: 0 0 18px 0; font-size: 12px; color: #777; line-height: 1.6; max-width: 520px; margin-left: auto; margin-right: auto;">${transactionalNotice}</p>`}
              <div style="font-size: 11px; color: #999;">
                <a href="${PRIVACY_POLICY_URL}" style="color: #999; text-decoration: underline;">Privacy Policy</a>
                &nbsp;&bull;&nbsp;
                <a href="${NOTIFICATION_SETTINGS_URL}" style="color: #999; text-decoration: underline;">Notification Settings</a>
              </div>
              <p style="margin: 20px auto 0; font-size: 10px; color: #bbb; line-height: 1.4; max-width: 500px;">CONFIDENTIALITY NOTICE: This message may contain protected health information. If you are not the intended recipient, please delete this email and notify the sender immediately.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function createEmailDocument({
  title,
  heading,
  accentColor,
  sections,
}: {
  title: string;
  heading: string;
  accentColor: string;
  sections: string;
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb;">
        <tr>
          <td align="center" style="padding: 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <tr>
                <td align="center" style="padding: 30px 20px;">
                  <img src="${LOGO_URL}" alt="NetCare Logo" width="150" height="26" style="display: block; margin: 0 auto;" />
                </td>
              </tr>
              <tr>
                <td style="padding: 0 30px;">
                  <h1 style="color: ${accentColor}; text-align: center; margin: 20px 0;">${heading}</h1>
                </td>
              </tr>
              ${sections}
              ${FOOTER_PLACEHOLDER}
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function injectEmailFooter(html: string, footerType: EmailFooterType = 'standard') {
  return html.replace(FOOTER_PLACEHOLDER, renderEmailFooter(footerType));
}

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  footerType?: EmailFooterType;
}

export async function sendEmail({ to, subject, html, footerType = 'standard' }: EmailData) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'NetCare <noreply@netcareflow.com>',
      to: [to],
      subject,
      html: injectEmailFooter(html, footerType),
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Email send failed:', error);
    return { success: false, error };
  }
}

export function generatePasswordResetEmail(resetUrl: string, userName: string) {
  return createEmailDocument({
    title: 'Password Reset',
    heading: 'Password Reset Request',
    accentColor: '#2563eb',
    sections: `
      <tr>
        <td style="padding: 0 30px; color: #333;">
          <p>Hello ${userName},</p>
          <p>You requested a password reset for your NetCare doctor account. Click the button below to reset your password:</p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding: 30px;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 30px; color: #666; font-size: 14px;">
          <p>This link will expire in 1 hour for security reasons.</p>
          <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
        </td>
      </tr>
    `,
  });
}

export async function sendDoctorWelcomeEmail({
  userId,
  doctorName,
  email,
  temporaryPassword,
  loginUrl,
}: {
  userId: string;
  doctorName: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
}) {
  const html = createEmailDocument({
    title: 'Welcome to NetCare',
    heading: `Welcome to NetCare, Dr. ${doctorName}`,
    accentColor: '#2563eb',
    sections: `
      <tr>
        <td style="padding: 0 30px; color: #333;">
          <p>Your doctor account has been successfully created! Below are your credentials to access the NetCare portal.</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 30px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 6px; border: 1px solid #e5e7eb;">
            <tr>
              <td style="padding: 15px;">
                <p style="margin: 5px 0; color: #333;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 5px 0; color: #333;"><strong>Temporary Password:</strong> ${temporaryPassword}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 30px; color: #dc2626;">
          <p style="margin: 0;"><strong>Important:</strong> Please change your password immediately after your first login for security reasons.</p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding: 20px;">
          <a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Login to NetCare</a>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 30px; color: #666; font-size: 14px;">
          <p>If you have any questions or need assistance, please contact our support team.</p>
        </td>
      </tr>
    `,
  });

  return sendEmail({
    to: email,
    subject: 'Welcome to the Team! Your Account at Netcare Flow is Ready',
    html,
    footerType: 'standard',
  });
}

export async function sendPatientWelcomeEmail({
  patientName,
  email,
}: {
  patientName: string;
  email: string;
}) {
  const html = createEmailDocument({
    title: 'Welcome to NetCare',
    heading: `Welcome to NetCare, ${patientName}`,
    accentColor: '#2563eb',
    sections: `
      <tr>
        <td style="padding: 0 30px; color: #333;">
          <p>Welcome to NetCare! We're excited to have you on board. Your account has been successfully created and is ready to use.</p>
          <p>With NetCare, you can:</p>
          <ul style="color: #333;">
            <li>Access your medical records securely</li>
            <li>Schedule and manage appointments with doctors</li>
            <li>View your health insights and vitals</li>
            <li>Receive prescription information</li>
          </ul>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/login" style="background-color: #2563eb; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Login to Your Account</a>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 30px; color: #666; font-size: 14px;">
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        </td>
      </tr>
    `,
  });

  return sendEmail({
    to: email,
    subject: 'Welcome to NetCare - Your Health Care Platform',
    html,
    footerType: 'standard',
  });
}

export async function sendAppointmentConfirmationEmail({
  patientName,
  email,
  doctorName,
  appointmentDate,
  appointmentTime,
}: {
  patientName: string;
  email: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
}) {
  const html = createEmailDocument({
    title: 'Appointment Confirmation',
    heading: 'Appointment Confirmed',
    accentColor: '#2563eb',
    sections: `
      <tr>
        <td style="padding: 0 30px; color: #333;">
          <p>Hello ${patientName},</p>
          <p>Your appointment has been confirmed! Here are the details:</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 30px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 6px; border: 1px solid #e5e7eb;">
            <tr>
              <td style="padding: 15px;">
                <p style="margin: 5px 0; color: #333;"><strong>Doctor:</strong> Dr. ${doctorName}</p>
                <p style="margin: 5px 0; color: #333;"><strong>Date:</strong> ${appointmentDate}</p>
                <p style="margin: 5px 0; color: #333;"><strong>Time:</strong> ${appointmentTime}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 30px; color: #666; font-size: 14px;">
          <p>Please arrive 10-15 minutes early to check in. If you need to reschedule or cancel, please contact us as soon as possible.</p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/patientsDashboard/appointments" style="background-color: #2563eb; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Your Appointments</a>
        </td>
      </tr>
    `,
  });

  return sendEmail({
    to: email,
    subject: 'Appointment Confirmed - NetCare',
    html,
    footerType: 'transactional',
  });
}

export async function sendAppointmentReminderEmail({
  patientName,
  email,
  doctorName,
  appointmentDate,
  appointmentTime,
}: {
  patientName: string;
  email: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
}) {
  const html = createEmailDocument({
    title: 'Appointment Reminder',
    heading: 'Appointment Reminder',
    accentColor: '#f59e0b',
    sections: `
      <tr>
        <td style="padding: 0 30px; color: #333;">
          <p>Hello ${patientName},</p>
          <p>This is a friendly reminder about your upcoming appointment:</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 30px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 6px; border: 1px solid #fcd34d;">
            <tr>
              <td style="padding: 15px;">
                <p style="margin: 5px 0; color: #333;"><strong>Doctor:</strong> Dr. ${doctorName}</p>
                <p style="margin: 5px 0; color: #333;"><strong>Date:</strong> ${appointmentDate}</p>
                <p style="margin: 5px 0; color: #333;"><strong>Time:</strong> ${appointmentTime}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 30px; color: #666; font-size: 14px;">
          <p>Please arrive 10-15 minutes early to check in. If you need to reschedule or cancel, please contact us as soon as possible.</p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/patientsDashboard/appointments" style="background-color: #f59e0b; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Your Appointments</a>
        </td>
      </tr>
    `,
  });

  return sendEmail({
    to: email,
    subject: 'Appointment Reminder - NetCare',
    html,
    footerType: 'transactional',
  });
}