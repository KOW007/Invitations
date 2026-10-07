'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Match = { first_name: string; last_name: string | null; token: string }
type EventInfo = { title: string; subtitle: string | null; image_path: string | null }

export default function SharedRsvpPage() {
  const { event_id } = useParams<{ event_id: string }>()
  const [event, setEvent] = useState<EventInfo | null>(null)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [searching, setSearching] = useState(false)
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [mode, setMode] = useState<'email' | 'name'>('email')
  const [name, setName] = useState('')

  useEffect(() => {
    fetch(`/api/rsvp/lookup?event_id=${event_id}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setEvent(d.event) })
      .catch(() => setError('Could not load event.'))
  }, [event_id])

  async function lookup(e: React.FormEvent) {
    e.preventDefault()
    const value = mode === 'email' ? email.trim() : name.trim()
    if (!value) return
    setSearching(true); setMatches(null)
    const res = await fetch('/api/rsvp/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id, [mode]: value }),
    }).then(r => r.json())
    const found: Match[] = res.matches ?? []
    // An exact email match goes straight through; name matches are always confirmed by picking
    if (mode === 'email' && found.length === 1) { window.location.href = `/invite/${found[0].token}`; return }
    if (mode === 'email' && found.length === 0) { setMode('name'); setSearching(false); return }
    setMatches(found)
    setSearching(false)
  }

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F8FF' }}>
      <p style={{ color: '#64748b', fontFamily: 'sans-serif' }}>{error}</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F0F8FF', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', fontFamily: "'Oxygen', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 448, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 32px rgba(74,144,217,0.10)', border: '1px solid #C5DCF0' }}>
        {event?.image_path && (
          <img src={event.image_path} alt={event.title} style={{ width: '100%', display: 'block', maxHeight: 260, objectFit: 'cover' }} />
        )}

        <div style={{ padding: '28px' }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 400, color: '#1e293b' }}>{event?.title || '…'}</h1>
          {event?.subtitle && <p style={{ margin: '0 0 16px', fontStyle: 'italic', color: '#64748b', fontSize: 15 }}>{event.subtitle}</p>}

          <form onSubmit={lookup} style={{ marginTop: 20 }}>
            {mode === 'email' ? (
              <>
                <label style={{ display: 'block', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', color: '#64748b', marginBottom: 6 }}>Enter the parent&apos;s email to RSVP</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
                  style={{ width: '100%', border: '1px solid #C5DCF0', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#334155', marginBottom: 12 }} />
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 12px', fontSize: 14, color: '#475569' }}>
                  We couldn&apos;t find that email on the guest list. Search by the student&apos;s name instead.
                </p>
                <label style={{ display: 'block', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', color: '#64748b', marginBottom: 6 }}>Student&apos;s name</label>
                <input value={name} onChange={e => setName(e.target.value)} required placeholder="First and/or last name"
                  style={{ width: '100%', border: '1px solid #C5DCF0', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#334155', marginBottom: 12 }} />
              </>
            )}
            <button type="submit" disabled={searching}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: '#4A90D9', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', opacity: searching ? .6 : 1 }}>
              {searching ? 'Looking…' : 'Continue'}
            </button>
          </form>

          {matches && matches.length === 0 && (
            <p style={{ marginTop: 16, fontSize: 14, color: '#475569' }}>
              We couldn&apos;t find that name on the guest list. Try a different spelling, or contact the host.
            </p>
          )}

          {matches && (matches.length > 1 || (mode === 'name' && matches.length === 1)) && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 14, color: '#475569', marginBottom: 8 }}>Who are you RSVPing for?</p>
              {matches.map(m => (
                <a key={m.token} href={`/invite/${m.token}`}
                  style={{ display: 'block', padding: '10px 12px', marginBottom: 8, border: '1px solid #C5DCF0', borderRadius: 8, color: '#1e293b', textDecoration: 'none', fontSize: 15 }}>
                  {m.first_name} {m.last_name || ''}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
