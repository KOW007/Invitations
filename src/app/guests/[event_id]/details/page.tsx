'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const PRIMARY = '#4A90D9'
const BORDER  = '#C5DCF0'

type Guest = {
  first_name: string; last_name: string | null; response: 'yes' | 'no' | null
  rsvp_answer_1: string | null; rsvp_answer_2: string | null
  message: string | null; responded_at: string | null
}
type Data = {
  event: { title: string; rsvp_question_1: string | null; rsvp_question_2: string | null }
  attending: Guest[]; declined: Guest[]; pending: Guest[]
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function GuestRows({ guests, showAnswers }: { guests: Guest[]; showAnswers?: boolean }) {
  if (!guests.length) return <p style={{ color: '#94a3b8', fontSize: 14, margin: '8px 0' }}>None yet.</p>
  return (
    <>
      {showAnswers && (
        <>
          <div style={{ textAlign: 'right', padding: '8px 0 0', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#64748b' }}>Adults/Kids</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 12px', borderBottom: `2px solid ${BORDER}`, fontSize: 15, fontWeight: 700, color: PRIMARY }}>
            <span>Total</span>
            <span>
              {guests.reduce((n, g) => n + (Number(g.rsvp_answer_1) || 0), 0)}/{guests.reduce((n, g) => n + (Number(g.rsvp_answer_2) || 0), 0)}
            </span>
          </div>
        </>
      )}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {guests.map((g, i) => (
          <li key={i} style={{ padding: '12px 0', borderBottom: i < guests.length - 1 ? `1px solid ${BORDER}` : 'none', fontSize: 14, color: '#475569' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{g.first_name} {g.last_name || ''}</div>
                {g.responded_at && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{fmtDate(g.responded_at)}</div>}
              </div>
              {showAnswers && (
                <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>{g.rsvp_answer_1 ?? '-'}/{g.rsvp_answer_2 ?? '-'}</span>
              )}
            </div>
            {g.message && <div style={{ marginTop: 6, fontStyle: 'italic' }}>&ldquo;{g.message}&rdquo;</div>}
          </li>
        ))}
      </ul>
    </>
  )
}

function Section({ title, count, children, accent }: { title: string; count?: number; children: React.ReactNode; accent: string }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '12px 20px', borderBottom: `1px solid ${BORDER}`, background: '#F8FBFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{title}</span>
        {count !== undefined && <span style={{ fontSize: 13, fontWeight: 600, color: accent, background: accent + '1a', padding: '2px 10px', borderRadius: 99 }}>{count}</span>}
      </div>
      <div style={{ padding: '4px 20px 12px' }}>
        {children}
      </div>
    </div>
  )
}

export default function GuestDetailsPage() {
  const { event_id } = useParams<{ event_id: string }>()
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get('key') || ''
    fetch(`/api/guest-details?event_id=${event_id}&key=${encodeURIComponent(key)}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError('Could not load RSVP details.'))
  }, [event_id])

  return (
    <div style={{ minHeight: '100vh', background: '#F0F8FF', fontFamily: "'Oxygen', sans-serif", padding: '32px 16px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ background: PRIMARY, borderRadius: 12, padding: '20px 24px', marginBottom: 20, color: '#fff' }}>
          <div style={{ fontSize: 12, opacity: .8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>RSVP Details</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{data?.event.title || '…'}</div>
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: 14 }}>{error}</p>}

        {data && (
          <>
            <Section title="Attending" accent="#2E86C1">
              <GuestRows guests={data.attending} showAnswers />
            </Section>
            <Section title="Declined" count={data.declined.length} accent="#64748b">
              <GuestRows guests={data.declined} />
            </Section>
            <Section title="No response yet" count={data.pending.length} accent="#94a3b8">
              <GuestRows guests={data.pending} />
            </Section>
          </>
        )}
      </div>
    </div>
  )
}
