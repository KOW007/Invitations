'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const PRIMARY = '#4A90D9'
const BORDER  = '#C5DCF0'

type Guest = { first_name: string; last_name: string | null }
type Data  = { event: { title: string }; attending: Guest[]; pending: Guest[] }

function GuestList({ guests }: { guests: Guest[] }) {
  if (!guests.length) return <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>None yet.</p>
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {guests.map((g, i) => (
        <li key={i} style={{ padding: '9px 0', borderBottom: i < guests.length - 1 ? `1px solid ${BORDER}` : 'none', fontSize: 15, color: '#1e293b' }}>
          {g.first_name} {g.last_name || ''}
        </li>
      ))}
    </ul>
  )
}

function Section({ title, count, children, accent }: { title: string; count: number; children: React.ReactNode; accent: string }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '12px 20px', borderBottom: `1px solid ${BORDER}`, background: '#F8FBFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{title}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: accent, background: accent + '1a', padding: '2px 10px', borderRadius: 99 }}>{count}</span>
      </div>
      <div style={{ padding: '4px 20px 12px' }}>
        {children}
      </div>
    </div>
  )
}

export default function GuestListPage() {
  const { event_id } = useParams<{ event_id: string }>()
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/guest-list?event_id=${event_id}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError('Could not load guest list.'))
  }, [event_id])

  return (
    <div style={{ minHeight: '100vh', background: '#F0F8FF', fontFamily: "'Oxygen', sans-serif", padding: '32px 16px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ background: PRIMARY, borderRadius: 12, padding: '20px 24px', marginBottom: 20, color: '#fff' }}>
          <div style={{ fontSize: 12, opacity: .8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>Guest List</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{data?.event.title || '…'}</div>
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: 14 }}>{error}</p>}

        {data && (
          <>
            <Section title="Attending" count={data.attending.length} accent="#2E86C1">
              <GuestList guests={data.attending} />
            </Section>
            <Section title="Pending" count={data.pending.length} accent="#94a3b8">
              <GuestList guests={data.pending} />
            </Section>
          </>
        )}
      </div>
    </div>
  )
}
