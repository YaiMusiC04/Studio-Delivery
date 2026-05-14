import { useState, useRef, useEffect } from 'react'
import { getProfile, getGoals } from '../lib/storage'

const GOAL_LABEL = { lose: 'bajar de peso', maintain: 'mantener peso', gain: 'ganar músculo' }
const ACT_LABEL  = { sedentary: 'sedentario', light: 'ligero', moderate: 'moderado', active: 'activo', veryActive: 'muy activo' }

function buildSystem(profile, goals) {
  return `Eres un coach personal de nutrición y fitness dentro de la app CalsTrack. Eres amigable, motivador y das consejos prácticos y concisos.

Perfil del usuario:
- Meta calórica diaria: ${goals.calories} kcal
- Proteína: ${goals.protein}g | Carbos: ${goals.carbs}g | Grasa: ${goals.fat}g
- Objetivo: ${GOAL_LABEL[profile?.goal] ?? 'no especificado'}
- Nivel de actividad: ${ACT_LABEL[profile?.activity] ?? 'no especificado'}

Puedes ayudar con preguntas sobre dieta, pérdida/ganancia de peso, ejercicio, macros, planificación de comidas y motivación.
Responde siempre en el idioma en que el usuario escribe. Sé directo y usa listas o emojis cuando ayuden a la claridad. Máximo 200 palabras por respuesta a menos que el usuario pida más detalle.`
}

const SUGGESTIONS = [
  '¿Cómo bajo de peso más rápido?',
  '¿Qué ejercicios me recomiendas?',
  '¿Cómo distribuyo mis macros?',
  '¿Qué comer para ganar músculo?',
]

function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      {!isUser && (
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(34,197,94,0.18)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8, alignSelf: 'flex-end' }}>
          <svg width="14" height="14" fill="var(--green)" viewBox="0 0 24 24">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
          </svg>
        </div>
      )}
      <div style={{
        maxWidth: '78%',
        padding: '11px 14px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser ? 'var(--green)' : 'rgba(255,255,255,0.07)',
        color: isUser ? '#000' : 'var(--text)',
        fontSize: 14, lineHeight: 1.55,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {msg.content}
        {msg.streaming && <span style={{ opacity: 0.5, animation: 'pulse 1s ease infinite' }}>▋</span>}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [busy, setBusy]         = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const profile   = getProfile()
  const goals     = getGoals()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content || busy) return
    setInput('')

    const userMsg = { role: 'user', content }
    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '', streaming: true }])
    setBusy(true)

    try {
      const history = [...messages, userMsg].map(({ role, content }) => ({ role, content }))
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history, system: buildSystem(profile, goals) }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Server error ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue
          try {
            const event = JSON.parse(raw)
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              setMessages(prev => {
                const last = prev[prev.length - 1]
                return [...prev.slice(0, -1), { ...last, content: last.content + event.delta.text }]
              })
            }
          } catch { /* non-JSON lines */ }
        }
      }

      setMessages(prev => {
        const last = prev[prev.length - 1]
        return [...prev.slice(0, -1), { ...last, streaming: false }]
      })
    } catch (err) {
      setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: `Lo siento, hubo un error: ${err.message}` }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', background: 'var(--bg)', color: 'var(--text)',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: 'calc(env(safe-area-inset-top) + 16px) 20px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--bg2)',
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" fill="var(--green)" viewBox="0 0 24 24">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>AI Coach</div>
          <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>Nutrición · Ejercicio · Dieta</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Tu coach personal</div>
            <div style={{ fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.6, marginBottom: 28 }}>
              Pregúntame cualquier cosa sobre tu dieta,<br/>ejercicio o cómo alcanzar tus metas.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  padding: '12px 16px', textAlign: 'left',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 12, color: 'var(--text-dim)', fontSize: 13,
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 14px',
        paddingBottom: 'calc(10px + 72px + env(safe-area-inset-bottom))',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg2)',
        display: 'flex', gap: 10, alignItems: 'flex-end',
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Escribe tu pregunta…"
          disabled={busy}
          style={{
            flex: 1, padding: '12px 14px', resize: 'none',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14, color: 'var(--text)', fontSize: 14, outline: 'none',
            fontFamily: 'Inter, sans-serif',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(34,197,94,0.45)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
        />
        <button onClick={() => send()} disabled={!input.trim() || busy} style={{
          width: 44, height: 44, flexShrink: 0,
          background: input.trim() && !busy ? 'var(--green)' : 'rgba(255,255,255,0.07)',
          border: 'none', borderRadius: 12, cursor: input.trim() && !busy ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}>
          {busy
            ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid var(--green)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            : <svg width="18" height="18" fill="none" stroke={input.trim() ? '#000' : 'rgba(255,255,255,0.3)'} strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          }
        </button>
      </div>
    </div>
  )
}
