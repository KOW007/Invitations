'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { Event, Invitee } from '@/lib/types'

function fmt(dateStr?: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function timeRange(e: Event) {
  if (!e.event_time) return ''
  return e.end_time ? `${e.event_time} – ${e.end_time}` : e.event_time
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<{ event: Event; invitee: Invitee } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<'yes' | 'no' | null>(null)
  const [message, setMessage] = useState('')
  const [answer1, setAnswer1] = useState('')
  const [answer2, setAnswer2] = useState('')
  const [step, setStep] = useState<'invite' | 'form' | 'confirm'>('invite')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/rsvp?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setData(d)
        if (d.invitee.response) {
          setSelected(d.invitee.response)
          setMessage(d.invitee.message || '')
          setAnswer1(d.invitee.rsvp_answer_1 || '')
          setAnswer2(d.invitee.rsvp_answer_2 || '')
          setStep('confirm')
        }
        setLoading(false)
      })
      .catch(() => { setError('Could not load invitation.'); setLoading(false) })
  }, [token])

  async function submit() {
    if (!selected) return
    setSubmitting(true)
    const res = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, response: selected, message, rsvp_answer_1: answer1, rsvp_answer_2: answer2 }),
    })
    const json = await res.json()
    if (json.error) { alert(json.error); setSubmitting(false); return }
    setData(prev => prev ? { ...prev, invitee: json.invitee } : prev)
    setStep('confirm')
    setSubmitting(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F8FF' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #AED6F1', borderTopColor: '#4A90D9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F8FF' }}>
      <p style={{ color: '#64748b', fontFamily: 'sans-serif' }}>{error}</p>
    </div>
  )

  if (!data) return null
  const { event, invitee } = data
  const acceptText = event.accept_text || 'Count me in!'
  const declineText = event.decline_text || 'Sorry to miss'
  const hasQuestions = selected === 'yes' && (event.rsvp_question_1 || event.rsvp_question_2)

  return (
    <div style={{ minHeight: '100vh', background: '#F0F8FF', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', fontFamily: "'Oxygen', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 448, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 32px rgba(74,144,217,0.10)', border: '1px solid #C5DCF0' }}>
        {event.image_path && (
          <img src={event.image_path} alt={event.title} style={{ width: '100%', display: 'block', maxHeight: 260, objectFit: 'cover' }} />
        )}

        <div style={{ padding: '28px 28px 0' }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 400, color: '#1e293b' }}>{event.title}</h1>
          {event.subtitle && <p style={{ margin: '0 0 16px', fontStyle: 'italic', color: '#64748b', fontSize: 15 }}>{event.subtitle}</p>}

          {(event.event_date || event.event_time || event.location) && (
            <div style={{ margin: '16px 0', padding: '14px 16px', background: '#EBF5FB', borderRadius: 10, fontSize: 14, color: '#334155' }}>
              {event.event_date && <div><strong>Date:</strong> {fmt(event.event_date)}</div>}
              {timeRange(event) && <div style={{ marginTop: 4 }}><strong>Time:</strong> {timeRange(event)}</div>}
              {event.location && <div style={{ marginTop: 4 }}><strong>Where:</strong> {event.location}</div>}
              {event.address && <div style={{ marginTop: 2, color: '#64748b' }}>{event.address}</div>}
            </div>
          )}

          {event.description && (
            <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.7, marginBottom: 16 }} dangerouslySetInnerHTML={{ __html: event.description }} />
          )}
        </div>

        <div style={{ padding: '8px 28px 0', textAlign: 'center' }}>
          <a href={`/guests/${event.id}`} style={{ fontSize: 12, color: '#4A90D9', textDecoration: 'none' }}>
            View guest list
          </a>
        </div>

        <div style={{ padding: '20px 28px 28px' }}>
          {step === 'invite' && (
            <>
              <p style={{ textAlign: 'center', fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>
                {invitee.first_name}, will you be joining us?
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => { setSelected('yes'); setStep('form') }}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', background: '#4A90D9', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {acceptText}
                </button>
                <button onClick={() => { setSelected('no'); setStep('form') }}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '2px solid #C5DCF0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {declineText}
                </button>
              </div>
            </>
          )}

          {step === 'form' && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <button onClick={() => setSelected('yes')}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `2px solid ${selected === 'yes' ? '#4A90D9' : '#C5DCF0'}`, background: selected === 'yes' ? '#EBF5FB' : '#fff', color: selected === 'yes' ? '#2E86C1' : '#64748b', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {acceptText}
                </button>
                <button onClick={() => setSelected('no')}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `2px solid ${selected === 'no' ? '#94a3b8' : '#C5DCF0'}`, background: selected === 'no' ? '#f1f5f9' : '#fff', color: selected === 'no' ? '#475569' : '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {declineText}
                </button>
              </div>

              {selected === 'yes' && (
                <>
                  {event.rsvp_question_1 && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', color: '#64748b', marginBottom: 6 }}>{event.rsvp_question_1}</label>
                      <input value={answer1} onChange={e => setAnswer1(e.target.value)}
                        style={{ width: '100%', border: '1px solid #C5DCF0', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#334155' }} />
                    </div>
                  )}
                  {event.rsvp_question_2 && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', color: '#64748b', marginBottom: 6 }}>{event.rsvp_question_2}</label>
                      <input value={answer2} onChange={e => setAnswer2(e.target.value)}
                        style={{ width: '100%', border: '1px solid #C5DCF0', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#334155' }} />
                    </div>
                  )}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', color: '#64748b', marginBottom: 6 }}>Message (optional)</label>
                    <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
                      placeholder="Looking forward to it!"
                      style={{ width: '100%', border: '1px solid #C5DCF0', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', color: '#334155' }} />
                  </div>
                </>
              )}

              <button onClick={submit} disabled={submitting || !selected}
                style={{ width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', background: '#4A90D9', color: '#fff', fontWeight: 700, fontSize: 15, cursor: submitting ? 'default' : 'pointer', fontFamily: 'inherit', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Sending…' : 'Send RSVP'}
              </button>
            </>
          )}

          {step === 'confirm' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: selected === 'yes' ? '#DBEAFE' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28, color: selected === 'yes' ? '#2E86C1' : '#64748b' }}>
                {selected === 'yes' ? '✓' : '×'}
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: selected === 'yes' ? '#2E86C1' : '#64748b' }}>
                {selected === 'yes' ? 'We look forward to seeing you!' : "We'll miss you."}
              </h2>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: '#94a3b8' }}>
                {invitee.first_name}, your response has been received.
              </p>
              {hasQuestions && (
                <div style={{ textAlign: 'left', background: '#EBF5FB', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#475569' }}>
                  {event.rsvp_question_1 && answer1 && <div><strong>{event.rsvp_question_1}:</strong> {answer1}</div>}
                  {event.rsvp_question_2 && answer2 && <div style={{ marginTop: 6 }}><strong>{event.rsvp_question_2}:</strong> {answer2}</div>}
                </div>
              )}
              <button onClick={() => setStep('form')}
                style={{ background: 'none', border: 'none', color: '#4A90D9', fontSize: 13, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>
                Update my response
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
