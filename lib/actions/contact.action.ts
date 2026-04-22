'use server'

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface ContactFormData {
  fullName: string
  email: string
  phone: string
  message: string
}

export async function submitContactForm(data: ContactFormData) {
  try {
    // Validate inputs
    if (!data.fullName || !data.email || !data.message) {
      return {
        success: false,
        error: 'Please fill in all required fields',
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      return {
        success: false,
        error: 'Please enter a valid email address',
      }
    }

    // Send email to support team with contact form submission
    const supportEmailResult = await resend.emails.send({
      from: 'NetCare Flow <noreply@netcareflow.com>',
      to: 'support@netcareflow.com',
      subject: `New Contact Form Submission from ${data.fullName}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #1a73e8; margin-bottom: 20px;">New Contact Form Submission</h2>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Name:</strong> ${data.fullName}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #0f172a; margin-bottom: 10px;">Message:</h3>
            <p style="white-space: pre-wrap; background-color: #f9fafb; padding: 15px; border-left: 4px solid #1a73e8; border-radius: 4px;">
              ${data.message}
            </p>
          </div>

          <p style="font-size: 12px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 15px;">
            <strong>Action Required:</strong> This contact form submission needs a response from the support team. 
            Please reach out to ${data.email} within 24 hours.
          </p>
        </div>
      `,
    })

    if (!supportEmailResult.data?.id) {
      return {
        success: false,
        error: 'Failed to send your message. Please try again.',
      }
    }

    // Send confirmation email to the user
    await resend.emails.send({
      from: 'NetCare Flow <noreply@netcareflow.com>',
      to: data.email,
      subject: 'We received your message',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #1a73e8; margin-bottom: 20px;">Thank you for contacting NetCare Flow</h2>
          
          <p>Hi ${data.fullName},</p>
          
          <p>We received your message and appreciate you reaching out. Our support team will review your inquiry and get back to you within 24 hours.</p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Your Message Summary:</strong></p>
            <p style="margin: 10px 0; color: #666;">${data.message.substring(0, 150)}${data.message.length > 150 ? '...' : ''}</p>
          </div>

          <p>If you have any urgent matters, you can also reach our support team directly:</p>
          <p>
            <strong>Email:</strong> <a href="mailto:support@netcareflow.com" style="color: #1a73e8;">support@netcareflow.com</a><br />
            <strong>Phone:</strong> +1 (555) 123-4567<br />
            <strong>Available:</strong> Monday - Friday, 9 AM - 6 PM CT
          </p>

          <p style="margin-top: 30px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px;">
            Best regards,<br />
            NetCare Flow Support Team
          </p>
        </div>
      `,
    })

    return {
      success: true,
      message: 'Thank you for your message! Our team will be in touch within 24 hours.',
    }
  } catch (error) {
    console.error('Contact form submission error:', error)
    return {
      success: false,
      error: 'An error occurred while processing your request. Please try again later.',
    }
  }
}
