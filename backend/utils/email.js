const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_KEY
  }
})

function sendOtpEmail(to, otp) {
  const mailOptions = {
    from: `"${process.env.SMTP_FROM || 'BimaOne.in'}" <${process.env.SMTP_FROM_EMAIL || 'desinplus1@gmail.com'}>`,
    to,
    subject: 'Password Reset OTP - BimaOne.in',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #003afd; margin: 0;">BimaOne.in</h1>
          <p style="color: #0c1f48; font-size: 12px; margin: 0;">All your policies. One smart place.</p>
        </div>
        <hr style="border: 1px solid #e5e7eb;" />
        <p style="font-size: 16px; color: #333;">Hello,</p>
        <p style="font-size: 14px; color: #555;">You requested a password reset for your BimaOne.in account.</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #003afd; background: #f0f4ff; padding: 15px 25px; border-radius: 10px; display: inline-block;">
            ${otp}
          </div>
        </div>
        <p style="font-size: 14px; color: #555;">This OTP is valid for <strong>10 minutes</strong>. Please do not share it with anyone.</p>
        <p style="font-size: 14px; color: #555;">If you did not request this, please ignore this email.</p>
        <hr style="border: 1px solid #e5e7eb;" />
        <p style="font-size: 12px; color: #999; text-align: center;">&copy; ${new Date().getFullYear()} BimaOne.in. All rights reserved.</p>
      </div>
    `
  }
  return transporter.sendMail(mailOptions)
}

function sendEmailVerificationEmail(to, otp) {
  const mailOptions = {
    from: `"${process.env.SMTP_FROM || 'BimaOne.in'}" <${process.env.SMTP_FROM_EMAIL || 'desinplus1@gmail.com'}>`,
    to,
    subject: 'Verify Your Email - BimaOne.in',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #003afd; margin: 0;">BimaOne.in</h1>
          <p style="color: #0c1f48; font-size: 12px; margin: 0;">All your policies. One smart place.</p>
        </div>
        <hr style="border: 1px solid #e5e7eb;" />
        <p style="font-size: 16px; color: #333;">Hello,</p>
        <p style="font-size: 14px; color: #555;">Please verify your email address to complete your BimaOne.in registration and unlock referral benefits.</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #003afd; background: #f0f4ff; padding: 15px 25px; border-radius: 10px; display: inline-block;">
            ${otp}
          </div>
        </div>
        <p style="font-size: 14px; color: #555;">This OTP is valid for <strong>10 minutes</strong>. Please do not share it with anyone.</p>
        <p style="font-size: 14px; color: #555;">If you did not create a BimaOne account, please ignore this email.</p>
        <hr style="border: 1px solid #e5e7eb;" />
        <p style="font-size: 12px; color: #999; text-align: center;">&copy; ${new Date().getFullYear()} BimaOne.in. All rights reserved.</p>
      </div>
    `
  }
  return transporter.sendMail(mailOptions)
}

module.exports = { sendOtpEmail, sendEmailVerificationEmail }
