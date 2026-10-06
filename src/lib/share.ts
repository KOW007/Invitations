import { createHmac, timingSafeEqual } from 'crypto'

/** Secret key for an event's private RSVP details link, derived from the server secret */
export function detailsKey(eventId: string) {
  return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!).update(eventId).digest('hex').slice(0, 32)
}

export function isValidDetailsKey(eventId: string, key: string) {
  const expected = Buffer.from(detailsKey(eventId))
  const given = Buffer.from(key)
  return given.length === expected.length && timingSafeEqual(given, expected)
}
