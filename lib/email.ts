import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Logo configuration for emails
const LOGO_URL = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/assets/icons/logo-full.svg.png`
  : 'https://netcareflow.com/assets/icons/logo-full.svg.png';

export interface EmailData {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailData) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'NetCare <noreply@netcareflow.com>', // Replace with your verified domain
      to: [to],
      subject,
      html,
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
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Password Reset</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb;">
        <tr>
          <td align="center" style="padding: 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <!-- Logo Header -->
              <tr>
                <td align="center" style="padding: 30px 20px;">
                  <img src="${LOGO_URL}" alt="NetCare Logo" width="150" height="26" style="display: block; margin: 0 auto;" />
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 0 30px;">
                  <h1 style="color: #2563eb; text-align: center; margin: 20px 0;">Password Reset Request</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 30px; color: #333;">
                  <p>Hello ${userName},</p>
                  <p>You requested a password reset for your NetCare doctor account. Click the button below to reset your password:</p>
                </td>
              </tr>
              <!-- CTA Button -->
              <tr>
                <td align="center" style="padding: 30px;">
                  <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
                </td>
              </tr>
              <!-- Footer Info -->
              <tr>
                <td style="padding: 0 30px; color: #666; font-size: 14px;">
                  <p>This link will expire in 1 hour for security reasons.</p>
                  <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
                </td>
              </tr>
              <!-- Divider -->
              <tr>
                <td style="padding: 20px 30px 0; border-top: 1px solid #e5e7eb;"></td>
              </tr>
              <!-- Footer -->
              <tr>
                <td align="center" style="padding: 20px 30px; color: #666; font-size: 12px;">
                  <p style="margin: 0;">This email was sent by NetCare. If you have any questions, please contact our support team.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
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
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to NetCare</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb;">
        <tr>
          <td align="center" style="padding: 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <!-- Logo Header -->
              <tr>
                <td align="center" style="padding: 30px 20px;">
                  <img src="${LOGO_URL}" alt="NetCare Logo" width="150" height="26" style="display: block; margin: 0 auto;" />
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 0 30px;">
                  <h1 style="color: #2563eb; text-align: center; margin: 20px 0;">Welcome to NetCare, Dr. ${doctorName}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 30px; color: #333;">
                  <p>Your doctor account has been successfully created! Below are your credentials to access the NetCare portal.</p>
                </td>
              </tr>
              <!-- Credentials Box -->
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
              <!-- Warning -->
              <tr>
                <td style="padding: 20px 30px; color: #dc2626;">
                  <p style="margin: 0;"><strong>⚠️ Important:</strong> Please change your password immediately after your first login for security reasons.</p>
                </td>
              </tr>
              <!-- CTA Button -->
              <tr>
                <td align="center" style="padding: 20px;">
                  <a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Login to NetCare</a>
                </td>
              </tr>
              <!-- Support -->
              <tr>
                <td style="padding: 0 30px; color: #666; font-size: 14px;">
                  <p>If you have any questions or need assistance, please contact our support team.</p>
                </td>
              </tr>
              <!-- Divider -->
              <tr>
                <td style="padding: 20px 30px 0; border-top: 1px solid #e5e7eb;"></td>
              </tr>
              <!-- Footer -->
              <tr>
                <td align="center" style="padding: 20px 30px; color: #666; font-size: 12px;">
                  <p style="margin: 0;">This email was sent by NetCare. Please do not reply to this email.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to NetCare - Doctor Portal Access',
    html,
  });
}

// Patient email templates
export async function sendPatientWelcomeEmail({
  patientName,
  email,
}: {
  patientName: string;
  email: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to NetCare</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb;">
        <tr>
          <td align="center" style="padding: 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <!-- Logo Header -->
              <tr>
                <td align="center" style="padding: 30px 20px;">
                  <img src="${LOGO_URL}" alt="NetCare Logo" width="150" height="26" style="display: block; margin: 0 auto;" />
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 0 30px;">
                  <h1 style="color: #2563eb; text-align: center; margin: 20px 0;">Welcome to NetCare, ${patientName}</h1>
                </td>
              </tr>
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
              <!-- CTA Button -->
              <tr>
                <td align="center" style="padding: 20px;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/login" style="background-color: #2563eb; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Login to Your Account</a>
                </td>
              </tr>
              <!-- Footer Info -->
              <tr>
                <td style="padding: 0 30px; color: #666; font-size: 14px;">
                  <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                </td>
              </tr>
              <!-- Divider -->
              <tr>
                <td style="padding: 20px 30px 0; border-top: 1px solid #e5e7eb;"></td>
              </tr>
              <!-- Footer -->
              <tr>
                <td align="center" style="padding: 20px 30px; color: #666; font-size: 12px;">
                  <p style="margin: 0;">This email was sent by NetCare. Please do not reply to this email.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to NetCare - Your Health Care Platform',
    html,
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
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Appointment Confirmation</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb;">
        <tr>
          <td align="center" style="padding: 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <!-- Logo Header -->
              <tr>
                <td align="center" style="padding: 30px 20px;">
                  <img src="${LOGO_URL}" alt="NetCare Logo" width="150" height="26" style="display: block; margin: 0 auto;" />
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 0 30px;">
                  <h1 style="color: #2563eb; text-align: center; margin: 20px 0;">Appointment Confirmed</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 30px; color: #333;">
                  <p>Hello ${patientName},</p>
                  <p>Your appointment has been confirmed! Here are the details:</p>
                </td>
              </tr>
              <!-- Appointment Details -->
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
              <!-- Info -->
              <tr>
                <td style="padding: 20px 30px; color: #666; font-size: 14px;">
                  <p>Please arrive 10-15 minutes early to check in. If you need to reschedule or cancel, please contact us as soon as possible.</p>
                </td>
              </tr>
              <!-- CTA Button -->
              <tr>
                <td align="center" style="padding: 20px;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/patientsDashboard/appointments" style="background-color: #2563eb; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Your Appointments</a>
                </td>
              </tr>
              <!-- Divider -->
              <tr>
                <td style="padding: 20px 30px 0; border-top: 1px solid #e5e7eb;"></td>
              </tr>
              <!-- Footer -->
              <tr>
                <td align="center" style="padding: 20px 30px; color: #666; font-size: 12px;">
                  <p style="margin: 0;">This email was sent by NetCare. Please do not reply to this email.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Appointment Confirmed - NetCare',
    html,
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
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Appointment Reminder</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb;">
        <tr>
          <td align="center" style="padding: 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <!-- Logo Header -->
              <tr>
                <td align="center" style="padding: 30px 20px;">
                  <img src="${LOGO_URL}" alt="NetCare Logo" width="150" height="26" style="display: block; margin: 0 auto;" />
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 0 30px;">
                  <h1 style="color: #f59e0b; text-align: center; margin: 20px 0;">Appointment Reminder</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 30px; color: #333;">
                  <p>Hello ${patientName},</p>
                  <p>This is a friendly reminder about your upcoming appointment:</p>
                </td>
              </tr>
              <!-- Appointment Details -->
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
              <!-- Divider -->
              <tr>
                <td style="padding: 20px 30px 0; border-top: 1px solid #e5e7eb;"></td>
              </tr>
              <!-- Footer -->
              <tr>
                <td align="center" style="padding: 20px 30px; color: #666; font-size: 12px;">
                  <p style="margin: 0;">This email was sent by NetCare. Please do not reply to this email.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Appointment Reminder - NetCare',
    html,
  });
}