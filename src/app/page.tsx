'use client'
import { useState, useEffect, useRef } from 'react'
import {
  Plus, Upload, Download, Copy, Check, Pencil, X, Mail, Trash2,
  UserPlus, Send, ChevronDown, ChevronUp, RefreshCw, Bell, Calendar, LogOut,
} from 'lucide-react'
import type { Event, Invitee } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

// ─── colour tokens ────────────────────────────────────────────────────────────
const PRIMARY = '#4A90D9'
const DARK    = '#2E86C1'
const LIGHT   = '#EBF5FB'
const BORDER  = '#C5DCF0'

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmt(dateStr?: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtTs(ts?: string) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const BLANK_EVENT: Partial<Event> = {
  title: '', subtitle: '', event_date: '', event_time: '', end_time: '',
  location: '', address: '', description: '',
  accept_text: 'Count me in!', decline_text: 'Sorry to miss',
  reminder_message: '', day_of_message: '',
  rsvp_question_1: '', rsvp_question_2: '',
  active: true,
}

type SortField = 'name' | 'response' | 'responded_at' | 'invited_at'
type FilterResp = 'all' | 'yes' | 'no' | 'pending'

// ─── input / textarea helpers ─────────────────────────────────────────────────
const inputCls: React.CSSProperties = {
  width: '100%', border: `1px solid ${BORDER}`, borderRadius: 8,
  padding: '8px 12px', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', color: '#334155', background: '#fff',
}
const labelCls: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b',
  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelCls}>{label}</label>
      {children}
    </div>
  )
}

// ─── badge ────────────────────────────────────────────────────────────────────
function Badge({ resp }: { resp?: string }) {
  if (resp === 'yes') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: LIGHT, color: DARK }}>
      <Check size={11} /> Yes
    </span>
  )
  if (resp === 'no') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: '#f1f5f9', color: '#64748b' }}>
      <X size={11} /> No
    </span>
  )
  return <span style={{ fontSize: 12, color: '#94a3b8' }}>Pending</span>
}

// ─── main component ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)

  const [events, setEvents] = useState<Event[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [invitees, setInvitees] = useState<Invitee[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingInvitees, setLoadingInvitees] = useState(false)

  // event form
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Event | null>(null)
  const [form, setForm] = useState<Partial<Event>>(BLANK_EVENT)
  const [savingEvent, setSavingEvent] = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const imgInputRef = useRef<HTMLInputElement>(null)

  // add person
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ first_name: '', last_name: '', email: '' })
  const [adding, setAdding] = useState(false)

  // csv import
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState('')
  const [replaceOnImport, setReplaceOnImport] = useState(false)
  const csvRef = useRef<HTMLInputElement>(null)

  // test email
  const [showTest, setShowTest] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testType, setTestType] = useState<'invitation' | 'reminder' | 'day-of'>('invitation')
  const [testStatus, setTestStatus] = useState('')
  const [sendingTest, setSendingTest] = useState(false)

  // sending
  const [showSendConfirm, setShowSendConfirm] = useState(false)
  const [onlyUnsent, setOnlyUnsent] = useState(true)
  const [sendingAll, setSendingAll] = useState(false)
  const [sendStatus, setSendStatus] = useState('')
  const [sendingR1, setSendingR1] = useState(false)
  const [r1Status, setR1Status] = useState('')
  const [sendingR2, setSendingR2] = useState(false)
  const [r2Status, setR2Status] = useState('')

  // table
  const [filter, setFilter] = useState<FilterResp>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const selected = events.find(e => e.id === selectedId)

  // ── load user ──
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // ── load events ──
  useEffect(() => {
    fetch('/api/events').then(r => r.json()).then(d => {
      setEvents(d.events || [])
      if (d.events?.length) setSelectedId(d.events[0].id)
      setLoadingEvents(false)
    })
  }, [])

  // ── load invitees ──
  useEffect(() => {
    if (!selectedId) return
    setLoadingInvitees(true)
    fetch(`/api/invitees?event_id=${selectedId}`).then(r => r.json()).then(d => {
      setInvitees(d.invitees || [])
      setLoadingInvitees(false)
    })
  }, [selectedId])

  function reloadInvitees() {
    if (!selectedId) return
    fetch(`/api/invitees?event_id=${selectedId}`).then(r => r.json()).then(d => setInvitees(d.invitees || []))
  }

  // ── stats ──
  const total   = invitees.length
  const yes     = invitees.filter(i => i.response === 'yes').length
  const no      = invitees.filter(i => i.response === 'no').length
  const pending = invitees.filter(i => !i.response).length

  const r1Eligible = invitees.filter(i => i.email && i.invited_at && !i.response && !i.reminder1_sent_at).length
  const r2Eligible = invitees.filter(i => i.email && i.response === 'yes' && !i.reminder2_sent_at).length

  // ── filtered / sorted invitees ──
  const filtered = invitees
    .filter(i => filter === 'all' || (filter === 'pending' ? !i.response : i.response === filter))
    .sort((a, b) => {
      let va: string, vb: string
      if (sortField === 'name') {
        va = `${a.last_name || ''} ${a.first_name}`.toLowerCase()
        vb = `${b.last_name || ''} ${b.first_name}`.toLowerCase()
      } else if (sortField === 'response') {
        va = a.response || 'zzz'
        vb = b.response || 'zzz'
      } else {
        va = (sortField === 'responded_at' ? a.responded_at : a.invited_at) || ''
        vb = (sortField === 'responded_at' ? b.responded_at : b.invited_at) || ''
      }
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  // ── event form ──
  function openNew() { setEditing(null); setForm(BLANK_EVENT); setShowForm(true) }
  function openEdit() { if (selected) { setEditing(selected); setForm({ ...selected }); setShowForm(true) } }

  async function uploadImage(file: File) {
    setUploadingImg(true)
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd }).then(r => r.json())
    if (res.path) setForm(f => ({ ...f, image_path: res.path }))
    setUploadingImg(false)
  }

  async function saveEvent() {
    if (!form.title?.trim()) return
    setSavingEvent(true)
    if (editing) {
      const res = await fetch('/api/events', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...form }) }).then(r => r.json())
      setEvents(ev => ev.map(e => e.id === editing.id ? res.event : e))
    } else {
      const res = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }).then(r => r.json())
      setEvents(ev => [res.event, ...ev])
      setSelectedId(res.event.id)
    }
    setSavingEvent(false)
    setShowForm(false)
  }

  // ── add person ──
  async function addPerson() {
    if (!addForm.first_name.trim() || !selectedId) return
    setAdding(true)
    const res = await fetch('/api/invitees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_id: selectedId, ...addForm }) }).then(r => r.json())
    setInvitees(inv => [...inv, res.invitee].sort((a, b) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`)))
    setAddForm({ first_name: '', last_name: '', email: '' })
    setAdding(false)
  }

  // ── csv import ──
  async function importCSV(file: File) {
    if (!selectedId) return
    setImporting(true); setImportStatus('')
    const fd = new FormData(); fd.append('file', file); fd.append('event_id', selectedId); fd.append('replace', String(replaceOnImport))
    const res = await fetch('/api/import', { method: 'POST', body: fd }).then(r => r.json())
    if (res.error) setImportStatus(`Error: ${res.error}`)
    else { setImportStatus(`Imported ${res.imported} guest${res.imported !== 1 ? 's' : ''}.`); reloadInvitees() }
    setImporting(false)
    if (csvRef.current) csvRef.current.value = ''
  }

  // ── copy link ──
  function copyLink(invitee: Invitee) {
    const url = `${window.location.origin}/invite/${invitee.token}`
    navigator.clipboard.writeText(url)
    setCopiedId(invitee.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // ── delete invitee ──
  async function deleteInvitee(id: string) {
    if (!confirm('Remove this guest?')) return
    await fetch(`/api/invitees?id=${id}`, { method: 'DELETE' })
    setInvitees(inv => inv.filter(i => i.id !== id))
  }

  // ── send invitations ──
  async function sendAll() {
    if (!selectedId) return
    setSendingAll(true); setSendStatus('')
    const res = await fetch('/api/send-invites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_id: selectedId, only_unsent: onlyUnsent }) }).then(r => r.json())
    setSendStatus(res.error ? `Error: ${res.error}` : `Sent ${res.sent}. ${res.failed?.length ? `Failed: ${res.failed.join(', ')}` : ''}`)
    setSendingAll(false); setShowSendConfirm(false); reloadInvitees()
  }

  // ── reminder 1 ──
  async function sendR1() {
    if (!selectedId) return
    setSendingR1(true); setR1Status('')
    const res = await fetch('/api/send-reminder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_id: selectedId }) }).then(r => r.json())
    setR1Status(res.error ? `Error: ${res.error}` : `Sent ${res.sent}.`)
    setSendingR1(false); reloadInvitees()
  }

  // ── reminder 2 ──
  async function sendR2() {
    if (!selectedId) return
    setSendingR2(true); setR2Status('')
    const res = await fetch('/api/send-reminder2', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_id: selectedId }) }).then(r => r.json())
    setR2Status(res.error ? `Error: ${res.error}` : `Sent ${res.sent}.`)
    setSendingR2(false); reloadInvitees()
  }

  // ── test email ──
  async function sendTestEmail() {
    if (!selectedId || !testEmail) return
    setSendingTest(true); setTestStatus('')
    const res = await fetch('/api/test-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_id: selectedId, email: testEmail, type: testType }) }).then(r => r.json())
    setTestStatus(res.error ? `Error: ${res.error}` : 'Test email sent!')
    setSendingTest(false)
  }

  // ── export csv ──
  function exportCSV() {
    const rows = [
      ['First Name', 'Last Name', 'Email', 'Response', 'Message', 'Q1 Answer', 'Q2 Answer', 'Responded At', 'Invited At', 'Invite Link'],
      ...invitees.map(i => [
        i.first_name, i.last_name || '', i.email || '', i.response || '', i.message || '',
        i.rsvp_answer_1 || '', i.rsvp_answer_2 || '',
        i.responded_at ? new Date(i.responded_at).toLocaleString() : '',
        i.invited_at ? new Date(i.invited_at).toLocaleString() : '',
        `${window.location.origin}/invite/${i.token}`,
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `${selected?.title || 'guests'}.csv`
    a.click()
  }

  // ── sort icon ──
  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronDown size={12} style={{ opacity: .3 }} />
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F0F8FF', fontFamily: "'Oxygen', sans-serif" }}>
      {/* header */}
      <div style={{ background: PRIMARY, color: '#fff', padding: '0 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 18 }}>
            <Calendar size={20} /> Invitation Manager
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user && <span style={{ fontSize: 13, opacity: .85 }}>{user.email}</span>}
            <button onClick={logout}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1px solid rgba(255,255,255,.35)', borderRadius: 7, background: 'rgba(255,255,255,.15)', color: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

        {/* event selector */}
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {loadingEvents ? <span style={{ color: '#94a3b8', fontSize: 14 }}>Loading…</span> : (
            <>
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                style={{ ...inputCls, width: 'auto', flex: '1 1 240px', minWidth: 180 }}>
                {events.map(e => (
                  <option key={e.id} value={e.id}>{e.title} · {fmt(e.event_date)}{!e.active ? ' (inactive)' : ''}</option>
                ))}
                {!events.length && <option value="">No events yet</option>}
              </select>
              {selected && (
                <button onClick={openEdit} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>
                  <Pencil size={13} /> Edit
                </button>
              )}
              <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: 'none', borderRadius: 8, background: PRIMARY, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Plus size={13} /> New Event
              </button>
            </>
          )}
        </div>

        {/* event form */}
        {showForm && (
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{editing ? 'Edit Event' : 'New Event'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <Field label="Event Title *">
                <input value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputCls} />
              </Field>
              <Field label="Subtitle">
                <input value={form.subtitle || ''} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} style={inputCls} />
              </Field>
              <Field label="Date">
                <input type="date" value={form.event_date || ''} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} style={inputCls} />
              </Field>
              <Field label="Start Time">
                <input value={form.event_time || ''} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} placeholder="6:00 PM" style={inputCls} />
              </Field>
              <Field label="End Time">
                <input value={form.end_time || ''} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} placeholder="9:00 PM" style={inputCls} />
              </Field>
              <Field label="Venue Name">
                <input value={form.location || ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} style={inputCls} />
              </Field>
              <Field label="Address">
                <input value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={inputCls} />
              </Field>
              <Field label="Accept Button Text">
                <input value={form.accept_text || ''} onChange={e => setForm(f => ({ ...f, accept_text: e.target.value }))} style={inputCls} />
              </Field>
              <Field label="Decline Button Text">
                <input value={form.decline_text || ''} onChange={e => setForm(f => ({ ...f, decline_text: e.target.value }))} style={inputCls} />
              </Field>
              <Field label="RSVP Question 1 (optional)">
                <input value={form.rsvp_question_1 || ''} onChange={e => setForm(f => ({ ...f, rsvp_question_1: e.target.value }))} placeholder="e.g. Dietary restrictions?" style={inputCls} />
              </Field>
              <Field label="RSVP Question 2 (optional)">
                <input value={form.rsvp_question_2 || ''} onChange={e => setForm(f => ({ ...f, rsvp_question_2: e.target.value }))} placeholder="e.g. Will you need parking?" style={inputCls} />
              </Field>
            </div>

            <div style={{ marginTop: 14 }}>
              <Field label="Description">
                <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inputCls, resize: 'vertical' }} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 14 }}>
              <Field label="Reminder Email Message">
                <textarea value={form.reminder_message || ''} onChange={e => setForm(f => ({ ...f, reminder_message: e.target.value }))} rows={2} placeholder="Please let us know if you can make it!" style={{ ...inputCls, resize: 'vertical' }} />
              </Field>
              <Field label="Day-Of Reminder Message">
                <textarea value={form.day_of_message || ''} onChange={e => setForm(f => ({ ...f, day_of_message: e.target.value }))} rows={2} placeholder="We're looking forward to seeing you!" style={{ ...inputCls, resize: 'vertical' }} />
              </Field>
            </div>

            {/* image upload */}
            <div style={{ marginTop: 14 }}>
              <label style={labelCls}>Event Image</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <input type="file" accept="image/*" ref={imgInputRef} style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) uploadImage(e.target.files[0]) }} />
                <button type="button" onClick={() => imgInputRef.current?.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>
                  <Upload size={14} /> {uploadingImg ? 'Uploading…' : 'Upload Image'}
                </button>
                {form.image_path && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img src={form.image_path} alt="" style={{ height: 48, width: 72, objectFit: 'cover', borderRadius: 6, border: `1px solid ${BORDER}` }} />
                    <button onClick={() => setForm(f => ({ ...f, image_path: undefined }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={14} /></button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.active !== false} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                Active
              </label>
              <div style={{ flex: 1 }} />
              <button onClick={() => setShowForm(false)} style={{ padding: '8px 20px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', color: '#64748b', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveEvent} disabled={savingEvent || !form.title?.trim()}
                style={{ padding: '8px 24px', border: 'none', borderRadius: 8, background: PRIMARY, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: savingEvent ? .7 : 1 }}>
                {savingEvent ? 'Saving…' : 'Save Event'}
              </button>
            </div>
          </div>
        )}

        {selectedId && (
          <>
            {/* stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Total Guests', count: total, key: 'all' as FilterResp },
                { label: 'Accepted', count: yes, key: 'yes' as FilterResp },
                { label: 'Declined', count: no, key: 'no' as FilterResp },
                { label: 'Pending', count: pending, key: 'pending' as FilterResp },
              ].map(s => (
                <button key={s.key} onClick={() => setFilter(f => f === s.key ? 'all' : s.key)}
                  style={{ background: filter === s.key ? LIGHT : '#fff', border: `1px solid ${filter === s.key ? PRIMARY : BORDER}`, borderRadius: 10, padding: '14px 16px', textAlign: 'left', cursor: 'pointer', transition: 'all .15s' }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: filter === s.key ? DARK : '#1e293b' }}>{s.count}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{s.label}</div>
                </button>
              ))}
            </div>

            {/* toolbar */}
            <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* import csv */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="file" accept=".csv" ref={csvRef} style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) importCSV(e.target.files[0]) }} />
                <button onClick={() => csvRef.current?.click()} disabled={importing}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', color: '#475569', fontSize: 13, cursor: 'pointer' }}>
                  <Upload size={13} /> {importing ? 'Importing…' : 'Import CSV'}
                </button>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" checked={replaceOnImport} onChange={e => setReplaceOnImport(e.target.checked)} />
                  Replace list
                </label>
              </div>

              <div style={{ width: 1, height: 24, background: BORDER }} />

              {/* add person */}
              <button onClick={() => setShowAdd(a => !a)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: `1px solid ${BORDER}`, borderRadius: 8, background: showAdd ? LIGHT : '#fff', color: '#475569', fontSize: 13, cursor: 'pointer' }}>
                <UserPlus size={13} /> Add Person
              </button>

              <div style={{ width: 1, height: 24, background: BORDER }} />

              {/* test email */}
              <button onClick={() => setShowTest(a => !a)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: `1px solid ${BORDER}`, borderRadius: 8, background: showTest ? LIGHT : '#fff', color: '#475569', fontSize: 13, cursor: 'pointer' }}>
                <Mail size={13} /> Test Email
              </button>

              <div style={{ width: 1, height: 24, background: BORDER }} />

              {/* export */}
              <button onClick={exportCSV}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', color: '#475569', fontSize: 13, cursor: 'pointer' }}>
                <Download size={13} /> Export
              </button>

              <div style={{ flex: 1 }} />

              {/* send invitations */}
              <button onClick={() => setShowSendConfirm(true)} disabled={!invitees.length}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', border: 'none', borderRadius: 8, background: PRIMARY, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: !invitees.length ? .5 : 1 }}>
                <Send size={13} /> Send Invitations
              </button>
            </div>

            {/* import status */}
            {importStatus && (
              <div style={{ padding: '8px 16px', borderRadius: 8, background: importStatus.startsWith('Error') ? '#fff1f2' : '#f0fdf4', border: `1px solid ${importStatus.startsWith('Error') ? '#fca5a5' : '#86efac'}`, color: importStatus.startsWith('Error') ? '#dc2626' : '#16a34a', fontSize: 13, marginBottom: 10 }}>
                {importStatus}
              </div>
            )}

            {/* add person panel */}
            {showAdd && (
              <div style={{ background: LIGHT, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px', marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 140px' }}>
                  <label style={labelCls}>First Name *</label>
                  <input value={addForm.first_name} onChange={e => setAddForm(f => ({ ...f, first_name: e.target.value }))} style={inputCls} />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                  <label style={labelCls}>Last Name</label>
                  <input value={addForm.last_name} onChange={e => setAddForm(f => ({ ...f, last_name: e.target.value }))} style={inputCls} />
                </div>
                <div style={{ flex: '2 1 200px' }}>
                  <label style={labelCls}>Email</label>
                  <input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} style={inputCls} />
                </div>
                <button onClick={addPerson} disabled={adding || !addForm.first_name.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', border: 'none', borderRadius: 8, background: PRIMARY, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: adding || !addForm.first_name.trim() ? .5 : 1, whiteSpace: 'nowrap' }}>
                  <Plus size={13} /> {adding ? 'Adding…' : 'Add'}
                </button>
              </div>
            )}

            {/* test email panel */}
            {showTest && (
              <div style={{ background: LIGHT, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px', marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 160px' }}>
                  <label style={labelCls}>Email Type</label>
                  <select value={testType} onChange={e => setTestType(e.target.value as typeof testType)} style={inputCls}>
                    <option value="invitation">Invitation</option>
                    <option value="reminder">Reminder — no response</option>
                    <option value="day-of">Day-of reminder</option>
                  </select>
                </div>
                <div style={{ flex: '2 1 200px' }}>
                  <label style={labelCls}>Send to Email</label>
                  <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="you@example.com" style={inputCls} />
                </div>
                <button onClick={sendTestEmail} disabled={sendingTest || !testEmail}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', border: 'none', borderRadius: 8, background: PRIMARY, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: sendingTest || !testEmail ? .5 : 1, whiteSpace: 'nowrap' }}>
                  <Mail size={13} /> {sendingTest ? 'Sending…' : 'Send Test'}
                </button>
                {testStatus && <div style={{ width: '100%', fontSize: 13, color: testStatus.startsWith('Error') ? '#dc2626' : '#16a34a' }}>{testStatus}</div>}
              </div>
            )}

            {/* send confirm modal */}
            {showSendConfirm && (
              <div style={{ background: LIGHT, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 12 }}>
                <p style={{ margin: '0 0 12px', fontWeight: 600, color: '#1e293b', fontSize: 14 }}>Send invitation emails?</p>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: '#64748b' }}>
                  This will email guests who have a valid email address. Note: Gmail limits ~500 emails/day.
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', cursor: 'pointer', marginBottom: 14 }}>
                  <input type="checkbox" checked={onlyUnsent} onChange={e => setOnlyUnsent(e.target.checked)} />
                  Only send to guests who haven&apos;t received an invitation yet
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowSendConfirm(false)} style={{ padding: '8px 18px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={sendAll} disabled={sendingAll}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', border: 'none', borderRadius: 8, background: PRIMARY, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: sendingAll ? .7 : 1 }}>
                    <Send size={13} /> {sendingAll ? 'Sending…' : 'Send Now'}
                  </button>
                </div>
                {sendStatus && <p style={{ margin: '10px 0 0', fontSize: 13, color: sendStatus.startsWith('Error') ? '#dc2626' : '#16a34a' }}>{sendStatus}</p>}
              </div>
            )}

            {/* reminder buttons */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              {r1Eligible > 0 && (
                <div>
                  <button onClick={sendR1} disabled={sendingR1}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid #fbbf24', borderRadius: 8, background: '#fffbeb', color: '#b45309', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <Bell size={13} /> {sendingR1 ? 'Sending…' : `Remind Non-Responders (${r1Eligible})`}
                  </button>
                  {r1Status && <p style={{ margin: '4px 0 0', fontSize: 12, color: r1Status.startsWith('Error') ? '#dc2626' : '#16a34a' }}>{r1Status}</p>}
                </div>
              )}
              {r2Eligible > 0 && (
                <div>
                  <button onClick={sendR2} disabled={sendingR2}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: `1px solid ${BORDER}`, borderRadius: 8, background: LIGHT, color: DARK, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <RefreshCw size={13} /> {sendingR2 ? 'Sending…' : `Day-Of Reminder (${r2Eligible})`}
                  </button>
                  {r2Status && <p style={{ margin: '4px 0 0', fontSize: 12, color: r2Status.startsWith('Error') ? '#dc2626' : '#16a34a' }}>{r2Status}</p>}
                </div>
              )}
            </div>

            {/* invitee table */}
            <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
              {loadingInvitees ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
              ) : !filtered.length ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                  {filter !== 'all' ? 'No guests match this filter.' : 'No guests yet. Import a CSV or add people above.'}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BORDER}`, background: '#F8FBFF' }}>
                        {[
                          { label: 'Name', field: 'name' as SortField },
                          { label: 'Email', field: null },
                          { label: 'Response', field: 'response' as SortField },
                          { label: 'Responded', field: 'responded_at' as SortField },
                          { label: 'Invited', field: 'invited_at' as SortField },
                          { label: 'Message / Answers', field: null },
                          { label: '', field: null },
                        ].map((col, i) => (
                          <th key={i} onClick={col.field ? () => toggleSort(col.field!) : undefined}
                            style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', cursor: col.field ? 'pointer' : 'default', whiteSpace: 'nowrap', userSelect: 'none' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              {col.label}{col.field && <SortIcon field={col.field} />}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((inv, idx) => (
                        <tr key={inv.id} style={{ borderBottom: `1px solid ${BORDER}`, background: idx % 2 === 1 ? '#FAFCFF' : '#fff' }}>
                          <td style={{ padding: '10px 20px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>
                            {inv.first_name} {inv.last_name || ''}
                          </td>
                          <td style={{ padding: '10px 20px', color: '#64748b', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {inv.email || '—'}
                          </td>
                          <td style={{ padding: '10px 20px' }}><Badge resp={inv.response} /></td>
                          <td style={{ padding: '10px 20px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtTs(inv.responded_at)}</td>
                          <td style={{ padding: '10px 20px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtTs(inv.invited_at)}</td>
                          <td style={{ padding: '10px 20px', color: '#64748b', maxWidth: 220 }}>
                            {inv.message && <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={inv.message}>{inv.message}</div>}
                            {inv.rsvp_answer_1 && <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={inv.rsvp_answer_1}>Q1: {inv.rsvp_answer_1}</div>}
                            {inv.rsvp_answer_2 && <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={inv.rsvp_answer_2}>Q2: {inv.rsvp_answer_2}</div>}
                          </td>
                          <td style={{ padding: '10px 20px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => copyLink(inv)} title="Copy invite link"
                                style={{ padding: '5px', border: `1px solid ${BORDER}`, borderRadius: 6, background: '#fff', cursor: 'pointer', color: copiedId === inv.id ? '#16a34a' : '#64748b', display: 'flex', alignItems: 'center' }}>
                                {copiedId === inv.id ? <Check size={13} /> : <Copy size={13} />}
                              </button>
                              <button onClick={() => deleteInvitee(inv.id)} title="Remove guest"
                                style={{ padding: '5px', border: '1px solid #fca5a5', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center' }}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: '10px 20px', fontSize: 12, color: '#94a3b8', borderTop: `1px solid ${BORDER}` }}>
                    Showing {filtered.length} of {total} guests
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
