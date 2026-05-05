'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PRIMARY = '#4A90D9'
const BORDER  = '#C5DCF0'
const LIGHT   = '#EBF5FB'

export default function LoginPage() {
  const [mode, setMode]       = useState<'signin' | 'signup'>('signin')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [info, setInfo]       = useState('')

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setInfo(''); setLoading(true)
    const supabase = createClient()

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      window.location.href = '/'
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      setInfo('Check your email for a confirmation link, then sign in.')
      setMode('signin')
    }
    setLoading(false)
  }, [mode, email, password])

  const inputStyle: React.CSSProperties = {
    width: '100%', border: `1px solid ${BORDER}`, borderRadius: 8,
    padding: '10px 14px', fontSize: 15, fontFamily: 'inherit',
    outline: 'none', color: '#334155', background: '#fff',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: "'Oxygen', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 20, border: `1px solid ${BORDER}`, boxShadow: '0 4px 32px rgba(74,144,217,0.10)', overflow: 'hidden' }}>

        {/* header */}
        <div style={{ background: PRIMARY, padding: '28px 32px', textAlign: 'center', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <Calendar size={32} />
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Invitation Manager</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, opacity: .85 }}>
            {mode === 'signin' ? 'Sign in to manage your events' : 'Create a new account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '28px 32px' }}>
          {info && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a', fontSize: 13, marginBottom: 16 }}>
              {info}
            </div>
          )}
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fff1f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.05em' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.05em' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} style={inputStyle} />
          </div>

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: PRIMARY, color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', opacity: loading ? .7 : 1 }}>
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button type="button" onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(''); setInfo('') }}
              style={{ background: 'none', border: 'none', color: PRIMARY, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
