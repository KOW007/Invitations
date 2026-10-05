import nodemailer from 'nodemailer'
import type { Event, Invitee } from './types'

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

const FROM = () =>
  `"${process.env.EMAIL_FROM_NAME || 'Invitations'}" <${process.env.SMTP_USER}>`

const BASE_URL = () => process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function timeRange(event: Event) {
  if (!event.event_time) return ''
  return event.end_time ? `${event.event_time} – ${event.end_time}` : event.event_time
}

function baseTemplate(content: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F0F8FF;font-family:Georgia,serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #C5DCF0;">
    ${content}
    <div style="padding:16px 32px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #EBF5FB;">
      Sent by Invitation Manager
    </div>
  </div>
</body>
</html>`
}

function eventBlock(event: Event, inviteUrl: string) {
  const imgSrc = event.image_path?.startsWith('http')
    ? event.image_path
    : event.image_path ? `${BASE_URL()}${event.image_path}` : null
  const imageHtml = imgSrc
    ? `<img src="${imgSrc}" style="width:100%;display:block;max-height:280px;object-fit:cover;" alt="${event.title}">`
    : ''
  return `
    ${imageHtml}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:36px 40px 8px;text-align:center;">
        <h1 style="margin:0 0 6px;font-size:24px;font-weight:normal;color:#2E4A7D;letter-spacing:.02em;">${event.title}</h1>
        ${event.subtitle ? `<p style="margin:0 0 8px;font-style:italic;color:#64748b;font-size:15px;">${event.subtitle}</p>` : ''}
      </td></tr>
      <tr><td style="padding:16px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:18px 22px;background:#EEF3FB;border-left:4px solid #F2B632;border-radius:10px;font-family:sans-serif;font-size:14px;line-height:1.6;color:#2E4A7D;">
            ${event.event_date ? `<div><strong>Date:</strong> ${formatDate(event.event_date)}</div>` : ''}
            ${timeRange(event) ? `<div style="margin-top:4px;"><strong>Time:</strong> ${timeRange(event)}</div>` : ''}
            ${event.location ? `<div style="margin-top:4px;"><strong>Where:</strong> ${event.location}</div>` : ''}
            ${event.address ? `<div style="margin-top:2px;color:#64748b;">${event.address}</div>` : ''}
          </td></tr>
        </table>
      </td></tr>
      ${event.description ? `<tr><td style="padding:8px 40px 8px;font-size:15px;color:#475569;line-height:1.7;font-family:sans-serif;">${event.description}</td></tr>` : ''}
      <tr><td style="padding:24px 40px 40px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
          <tr><td bgcolor="#4F7ECE" style="background:#4F7ECE;border-radius:999px;border:2px solid #F2B632;">
            <a href="${inviteUrl}" style="display:inline-block;padding:14px 44px;color:#ffffff;text-decoration:none;font-family:sans-serif;font-size:15px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;"><span style="color:#ffffff;">RSVP Now</span></a>
          </td></tr>
        </table>
        <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;font-family:sans-serif;">Or copy this link:<br><a href="${inviteUrl}" style="color:#4F7ECE;word-break:break-all;">${inviteUrl}</a></p>
      </td></tr>
    </table>`
}

export async function sendInvitation(event: Event, invitee: Invitee) {
  const url = `${BASE_URL()}/invite/${invitee.token}`
  const transport = createTransport()
  const info = await transport.sendMail({
    from: FROM(),
    to: invitee.email!,
    subject: `You're Invited: ${event.title}`,
    html: baseTemplate(`
      ${eventBlock(event, url)}
    `),
  })
  if (info.rejected.length > 0) throw new Error(`address rejected by server`)
}

export async function sendReminder(event: Event, invitee: Invitee) {
  const url = `${BASE_URL()}/invite/${invitee.token}`
  const transport = createTransport()
  const customMsg = event.reminder_message || `${invitee.first_name}, please let us know if you can make it!`
  const info = await transport.sendMail({
    from: FROM(),
    to: invitee.email!,
    subject: `Reminder to RSVP: ${event.title}`,
    html: baseTemplate(`
      ${eventBlock(event, url)}
      <div style="padding:0 40px 28px;font-family:sans-serif;font-size:14px;color:#475569;text-align:center;">
        <p>${customMsg}</p>
      </div>
    `),
  })
  if (info.rejected.length > 0) throw new Error(`address rejected by server`)
}

export async function sendDayOfReminder(event: Event, invitee: Invitee) {
  const url = `${BASE_URL()}/invite/${invitee.token}`
  const transport = createTransport()
  const customMsg = event.day_of_message || `${invitee.first_name}, we're looking forward to seeing you!`
  const info = await transport.sendMail({
    from: FROM(),
    to: invitee.email!,
    subject: `Reminder: ${event.title}`,
    html: baseTemplate(`
      ${eventBlock(event, url)}
      <div style="padding:0 40px 28px;font-family:sans-serif;font-size:14px;color:#475569;text-align:center;">
        <p>${customMsg}</p>
        <p style="font-size:12px;color:#94a3b8;margin-top:8px;">Need to update your RSVP? <a href="${url}" style="color:#4F7ECE;">Click here</a>.</p>
      </div>
    `),
  })
  if (info.rejected.length > 0) throw new Error(`address rejected by server`)
}
