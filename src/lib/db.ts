import fs from 'fs'
import path from 'path'
import type { Event, Invitee } from './types'

const DATA_DIR = path.join(process.cwd(), 'data')
const EVENTS_FILE = path.join(DATA_DIR, 'events.json')
const INVITEES_FILE = path.join(DATA_DIR, 'invitees.json')

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readJson<T>(file: string): T[] {
  ensureDir()
  if (!fs.existsSync(file)) return []
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')) } catch { return [] }
}

function writeJson<T>(file: string, data: T[]) {
  ensureDir()
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

export const db = {
  events: {
    all: (): Event[] => readJson<Event>(EVENTS_FILE),
    find: (id: string) => readJson<Event>(EVENTS_FILE).find(e => e.id === id),
    create: (event: Event) => {
      const events = readJson<Event>(EVENTS_FILE)
      events.push(event)
      writeJson(EVENTS_FILE, events)
      return event
    },
    update: (id: string, patch: Partial<Event>) => {
      const events = readJson<Event>(EVENTS_FILE)
      const idx = events.findIndex(e => e.id === id)
      if (idx === -1) return null
      events[idx] = { ...events[idx], ...patch }
      writeJson(EVENTS_FILE, events)
      return events[idx]
    },
    delete: (id: string) => {
      const events = readJson<Event>(EVENTS_FILE).filter(e => e.id !== id)
      writeJson(EVENTS_FILE, events)
    },
  },

  invitees: {
    all: (): Invitee[] => readJson<Invitee>(INVITEES_FILE),
    forEvent: (event_id: string) =>
      readJson<Invitee>(INVITEES_FILE).filter(i => i.event_id === event_id),
    find: (id: string) => readJson<Invitee>(INVITEES_FILE).find(i => i.id === id),
    findByToken: (token: string) =>
      readJson<Invitee>(INVITEES_FILE).find(i => i.token === token),
    create: (invitee: Invitee) => {
      const invitees = readJson<Invitee>(INVITEES_FILE)
      invitees.push(invitee)
      writeJson(INVITEES_FILE, invitees)
      return invitee
    },
    createMany: (newOnes: Invitee[], event_id: string, replace: boolean) => {
      let invitees = readJson<Invitee>(INVITEES_FILE)
      if (replace) invitees = invitees.filter(i => i.event_id !== event_id)
      invitees.push(...newOnes)
      writeJson(INVITEES_FILE, invitees)
    },
    update: (id: string, patch: Partial<Invitee>) => {
      const invitees = readJson<Invitee>(INVITEES_FILE)
      const idx = invitees.findIndex(i => i.id === id)
      if (idx === -1) return null
      invitees[idx] = { ...invitees[idx], ...patch }
      writeJson(INVITEES_FILE, invitees)
      return invitees[idx]
    },
    updateByToken: (token: string, patch: Partial<Invitee>) => {
      const invitees = readJson<Invitee>(INVITEES_FILE)
      const idx = invitees.findIndex(i => i.token === token)
      if (idx === -1) return null
      invitees[idx] = { ...invitees[idx], ...patch }
      writeJson(INVITEES_FILE, invitees)
      return invitees[idx]
    },
    delete: (id: string) => {
      const invitees = readJson<Invitee>(INVITEES_FILE).filter(i => i.id !== id)
      writeJson(INVITEES_FILE, invitees)
    },
  },
}
