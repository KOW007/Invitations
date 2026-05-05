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
    <div style="padding:32px 48px;">
      <h1 style="margin:0 0 4px;font-size:22px;font-weight:normal;color:#1e293b;">${event.title}</h1>
      ${event.subtitle ? `<p style="margin:0 0 16px;font-style:italic;color:#64748b;font-size:15px;">${event.subtitle}</p>` : ''}
      <div style="margin:16px 0;padding:16px;background:#F0F8FF;border-radius:10px;font-family:sans-serif;font-size:14px;color:#334155;">
        ${event.event_date ? `<div><strong>Date:</strong> ${formatDate(event.event_date)}</div>` : ''}
        ${timeRange(event) ? `<div style="margin-top:4px;"><strong>Time:</strong> ${timeRange(event)}</div>` : ''}
        ${event.location ? `<div style="margin-top:4px;"><strong>Where:</strong> ${event.location}</div>` : ''}
        ${event.address ? `<div style="margin-top:2px;color:#64748b;">${event.address}</div>` : ''}
      </div>
      ${event.description ? `<p style="font-size:14px;color:#475569;line-height:1.6;font-family:sans-serif;margin:0;">${event.description}</p>` : ''}
    </div>
    <div style="padding:0 48px 36px;text-align:center;">
      <a href="${inviteUrl}" style="display:inline-block;background:#4A90D9;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-family:sans-serif;font-size:14px;font-weight:600;">RSVP Now</a>
      <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;font-family:sans-serif;">Or copy this link: ${inviteUrl}</p>
    </div>`
}

export async function sendInvitation(event: Event, invitee: Invitee) {
  const url = `${BASE_URL()}/invite/${invitee.token}`
  const transport = createTransport()
  await transport.sendMail({
    from: FROM(),
    to: invitee.email!,
    subject: `You're Invited — ${event.title}`,
    html: baseTemplate(`
      ${eventBlock(event, url)}
    `),
  })
}

export async function sendReminder(event: Event, invitee: Invitee) {
  const url = `${BASE_URL()}/invite/${invitee.token}`
  const transport = createTransport()
  const customMsg = event.reminder_message || `${invitee.first_name}, please let us know if you can make it!`
  await transport.sendMail({
    from: FROM(),
    to: invitee.email!,
    subject: `Reminder to RSVP — ${event.title}`,
    html: baseTemplate(`
      ${eventBlock(event, url)}
      <div style="padding:0 32px 24px;font-family:sans-serif;font-size:14px;color:#475569;text-align:center;">
        <p>${customMsg}</p>
      </div>
    `),
  })
}

export async function sendDayOfReminder(event: Event, invitee: Invitee) {
  const url = `${BASE_URL()}/invite/${invitee.token}`
  const transport = createTransport()
  const customMsg = event.day_of_message || `${invitee.first_name}, we're looking forward to seeing you!`
  await transport.sendMail({
    from: FROM(),
    to: invitee.email!,
    subject: `Reminder — ${event.title}`,
    html: baseTemplate(`
      ${eventBlock(event, url)}
      <div style="padding:0 32px 24px;font-family:sans-serif;font-size:14px;color:#475569;text-align:center;">
        <p>${customMsg}</p>
        <p style="font-size:12px;color:#94a3b8;margin-top:8px;">Need to update your RSVP? <a href="${url}" style="color:#4A90D9;">Click here</a>.</p>
      </div>
    `),
  })
}
