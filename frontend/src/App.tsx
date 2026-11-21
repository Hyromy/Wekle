import { type FormEvent, useEffect, useMemo, useState } from "react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { type EventItem, useAgenda } from "./hooks/useAgenda"

function toDatetimeLocal(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function formatDateRange(start: number, end: number): string {
  const opts: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  }
  return `${new Date(start * 1000).toLocaleString("es-MX", opts)} → ${new Date(
    end * 1000
  ).toLocaleString("es-MX", opts)}`
}

export default function App() {
  const {
    connected,
    calendars,
    events,
    loading,
    txPending,
    error,
    refresh,
    createCalendar,
    updateCalendar,
    deleteCalendar,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useAgenda()

  const [selectedCalKey, setSelectedCalKey] = useState<string>("")
  const [newCalName, setNewCalName] = useState("")
  const [editingCalKey, setEditingCalKey] = useState<string | null>(null)
  const [editingCalName, setEditingCalName] = useState("")

  const nowUnix = Math.floor(Date.now() / 1000)
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [startInput, setStartInput] = useState(() => toDatetimeLocal(nowUnix))
  const [endInput, setEndInput] = useState(() => toDatetimeLocal(nowUnix + 3600))

  useEffect(() => {
    if (calendars.length === 0) {
      setSelectedCalKey("")
      return
    }
    if (!calendars.some((c) => c.publicKey.toBase58() === selectedCalKey)) {
      setSelectedCalKey(calendars[0].publicKey.toBase58())
    }
  }, [calendars, selectedCalKey])

  const activeCalendar = useMemo(
    () => calendars.find((c) => c.publicKey.toBase58() === selectedCalKey) ?? null,
    [calendars, selectedCalKey]
  )

  const calendarEvents = useMemo(
    () =>
      activeCalendar
        ? events.filter((e) => e.calendar.equals(activeCalendar.publicKey))
        : [],
    [events, activeCalendar]
  )

  const resetEventForm = () => {
    const base = Math.floor(Date.now() / 1000)
    setEditingEvent(null)
    setTitle("")
    setContent("")
    setStartInput(toDatetimeLocal(base))
    setEndInput(toDatetimeLocal(base + 3600))
  }

  const handleCreateCalendar = async (e: FormEvent) => {
    e.preventDefault()
    if (!newCalName.trim()) return
    await createCalendar(newCalName.trim())
    setNewCalName("")
  }

  const handleSaveCalendarEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingCalKey || !editingCalName.trim()) return
    const target = calendars.find((c) => c.publicKey.toBase58() === editingCalKey)
    if (!target) return
    await updateCalendar(target.publicKey, editingCalName.trim())
    setEditingCalKey(null)
  }

  const handleEventSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!activeCalendar) return

    const startUnix = Math.floor(new Date(startInput).getTime() / 1000)
    const endUnix = Math.floor(new Date(endInput).getTime() / 1000)

    if (editingEvent) {
      await updateEvent(editingEvent.publicKey, title.trim(), content.trim(), startUnix, endUnix)
    } else {
      await createEvent(activeCalendar.publicKey, title.trim(), content.trim(), startUnix, endUnix)
    }
    resetEventForm()
  }

  const startEditEvent = (ev: EventItem) => {
    setEditingEvent(ev)
    setTitle(ev.title)
    setContent(ev.content)
    setStartInput(toDatetimeLocal(ev.startAt))
    setEndInput(toDatetimeLocal(ev.endAt))
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <h1>Wekle</h1>
          <span className="badge">Devnet</span>
        </div>

        <WalletMultiButton />

        {connected && (
          <>
            <form onSubmit={handleCreateCalendar} className="cal-form">
              <input
                type="text"
                placeholder="Nuevo calendario..."
                maxLength={50}
                value={newCalName}
                onChange={(e) => setNewCalName(e.target.value)}
                disabled={txPending}
              />
              <button type="submit" disabled={txPending || !newCalName.trim()}>
                +
              </button>
            </form>

            <div className="cal-list">
              {calendars.map((cal) => {
                const key = cal.publicKey.toBase58()
                const isSelected = key === selectedCalKey
                const isEditing = key === editingCalKey

                return (
                  <div
                    key={key}
                    className={`cal-item ${isSelected ? "active" : ""}`}
                    onClick={() => !isEditing && setSelectedCalKey(key)}
                  >
                    {isEditing ? (
                      <form onSubmit={handleSaveCalendarEdit} className="inline-edit">
                        <input
                          value={editingCalName}
                          maxLength={50}
                          onChange={(e) => setEditingCalName(e.target.value)}
                          autoFocus
                        />
                        <button type="submit" disabled={txPending}>✓</button>
                        <button type="button" onClick={() => setEditingCalKey(null)}>✕</button>
                      </form>
                    ) : (
                      <>
                        <span>{cal.name}</span>
                        <div className="actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            title="Renombrar"
                            disabled={txPending}
                            onClick={() => {
                              setEditingCalKey(key)
                              setEditingCalName(cal.name)
                            }}
                          >
                            ✎
                          </button>
                          <button
                            title="Eliminar calendario y sus eventos"
                            disabled={txPending}
                            onClick={() => deleteCalendar(cal.publicKey)}
                          >
                            🗑
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </aside>

      <main className="main">
        {error && <div className="alert error">{error}</div>}
        {txPending && <div className="alert info">Firmando transacción en Solana...</div>}

        {!connected ? (
          <div className="empty-state">
            <h2>Conecta tu wallet Solflare</h2>
            <p>Asegúrate de tenerla en modo Devnet para crear calendarios y eventos.</p>
          </div>
        ) : !activeCalendar ? (
          <div className="empty-state">
            <h2>{loading ? "Cargando cuentas..." : "Crea tu primer calendario"}</h2>
            <p>Usa el campo de la izquierda para empezar tu agenda on-chain.</p>
          </div>
        ) : (
          <>
            <header className="main-header">
              <h2>{activeCalendar.name}</h2>
              <button onClick={refresh} disabled={loading || txPending}>
                {loading ? "Sincronizando..." : "↻ Refrescar"}
              </button>
            </header>

            <form onSubmit={handleEventSubmit} className="event-form">
              <h3>{editingEvent ? "Editar evento" : "Nuevo evento"}</h3>
              <input
                type="text"
                placeholder="Título obligatorio (máx. 50)"
                maxLength={50}
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={txPending}
              />
              <textarea
                placeholder="Descripción opcional (máx. 200)"
                maxLength={200}
                rows={2}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={txPending}
              />
              <div className="dates-row">
                <label>
                  Inicio
                  <input
                    type="datetime-local"
                    required
                    value={startInput}
                    onChange={(e) => setStartInput(e.target.value)}
                    disabled={txPending}
                  />
                </label>
                <label>
                  Fin
                  <input
                    type="datetime-local"
                    required
                    value={endInput}
                    onChange={(e) => setEndInput(e.target.value)}
                    disabled={txPending}
                  />
                </label>
              </div>
              <div className="form-buttons">
                <button type="submit" disabled={txPending || !title.trim()}>
                  {editingEvent ? "Guardar cambios" : "Agendar evento"}
                </button>
                {editingEvent && (
                  <button type="button" className="secondary" onClick={resetEventForm}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            <section className="events-list">
              {calendarEvents.length === 0 ? (
                <p className="muted">No hay eventos en este calendario todavía.</p>
              ) : (
                calendarEvents.map((ev) => (
                  <article key={ev.publicKey.toBase58()} className="event-card">
                    <div>
                      <h4>{ev.title}</h4>
                      <small>{formatDateRange(ev.startAt, ev.endAt)}</small>
                      {ev.content && <p>{ev.content}</p>}
                    </div>
                    <div className="actions">
                      <button disabled={txPending} onClick={() => startEditEvent(ev)}>
                        Editar
                      </button>
                      <button
                        className="danger"
                        disabled={txPending}
                        onClick={() => deleteEvent(ev.publicKey)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
