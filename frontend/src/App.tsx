import { type FormEvent, useEffect, useMemo, useState } from "react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { PublicKey } from "@solana/web3.js"
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

function formatTimestamp(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "medium",
  })
}

function shortKey(key: PublicKey | string): string {
  const str = typeof key === "string" ? key : key.toBase58()
  return `${str.slice(0, 6)}...${str.slice(-6)}`
}

export default function App() {
  const {
    connected,
    programId,
    calendars,
    events,
    transactions,
    loading,
    txPending,
    error,
    refresh,
    inspectedTx,
    inspecting,
    inspectError,
    inspectTransaction,
    createCalendar,
    updateCalendar,
    deleteCalendar,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useAgenda()

  const [activeTab, setActiveTab] = useState<"events" | "transactions">("events")
  const [copiedSig, setCopiedSig] = useState<string | null>(null)
  const [sigQuery, setSigQuery] = useState("")

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

  const copySignature = async (sig: string) => {
    await navigator.clipboard.writeText(sig)
    setCopiedSig(sig)
    setTimeout(() => setCopiedSig(null), 1500)
  }

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
      await updateEvent(
        editingEvent.publicKey,
        title.trim(),
        content.trim(),
        startUnix,
        endUnix
      )
    } else {
      await createEvent(
        activeCalendar.publicKey,
        title.trim(),
        content.trim(),
        startUnix,
        endUnix
      )
    }
    resetEventForm()
  }

  const handleInspectSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!sigQuery.trim()) return
    await inspectTransaction(sigQuery)
  }

  const startEditEvent = (ev: EventItem) => {
    setEditingEvent(ev)
    setTitle(ev.title)
    setContent(ev.content)
    setStartInput(toDatetimeLocal(ev.startAt))
    setEndInput(toDatetimeLocal(ev.endAt))
    setActiveTab("events")
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <h1>Wekle</h1>
          <span className="badge">Devnet</span>
        </div>

        <WalletMultiButton />

        {!connected && (
          <div className="readonly-banner">
            <strong>Modo lectura pública</strong>
            <span>
              Explora los calendarios on-chain o inspecciona transacciones. Conecta
              Solflare para crear los tuyos.
            </span>
          </div>
        )}

        {connected && (
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
        )}

        <div className="cal-list">
          {calendars.length === 0 ? (
            <p className="sidebar-muted">
              {loading ? "Leyendo Devnet..." : "Sin calendarios aún."}
            </p>
          ) : (
            calendars.map((cal) => {
              const key = cal.publicKey.toBase58()
              const isSelected = key === selectedCalKey
              const isEditing = key === editingCalKey

              return (
                <div
                  key={key}
                  className={`cal-item ${isSelected ? "active" : ""}`}
                  onClick={() => {
                    if (!isEditing) {
                      setSelectedCalKey(key)
                      setActiveTab("events")
                    }
                  }}
                >
                  {isEditing && connected ? (
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
                      <div className="cal-meta">
                        <span>{cal.name}</span>
                        {!connected && (
                          <small className="owner-tag">Autor: {shortKey(cal.authority)}</small>
                        )}
                      </div>
                      {connected && (
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
                      )}
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>
      </aside>

      <main className="main">
        {error && <div className="alert error">{error}</div>}
        {txPending && <div className="alert info">Firmando transacción en Solana...</div>}

        <header className="main-header">
          <div className="tabs">
            <button
              className={`tab ${activeTab === "events" ? "active" : ""}`}
              onClick={() => setActiveTab("events")}
            >
              {connected ? "Mi Agenda" : "Agenda Pública"}{" "}
              {activeCalendar ? `(${activeCalendar.name})` : ""}
            </button>
            <button
              className={`tab ${activeTab === "transactions" ? "active" : ""}`}
              onClick={() => setActiveTab("transactions")}
            >
              {connected
                ? `Transacciones (${transactions.length})`
                : "Inspector de Transacciones"}
            </button>
          </div>
          <button onClick={refresh} disabled={loading || txPending}>
            {loading ? "Sincronizando..." : "↻ Refrescar"}
          </button>
        </header>

        {activeTab === "transactions" ? (
          <section className="tx-section">
            <form onSubmit={handleInspectSubmit} className="inspector-box">
              <div className="inspector-header">
                <h3>Consultar transacción en Devnet</h3>
                <small>
                  Programa: <code>{shortKey(programId)}</code>
                </small>
              </div>
              <div className="inspector-row">
                <input
                  type="text"
                  placeholder="Pega la firma (signature) de una transacción de Solana..."
                  value={sigQuery}
                  onChange={(e) => setSigQuery(e.target.value)}
                  disabled={inspecting}
                />
                <button type="submit" disabled={inspecting || !sigQuery.trim()}>
                  {inspecting ? "Consultando..." : "Inspeccionar"}
                </button>
              </div>
            </form>

            {inspectError && <div className="alert error">{inspectError}</div>}

            {inspectedTx && (
              <article className="tx-card inspected">
                <div className="tx-info full">
                  <div className="tx-badges">
                    <span
                      className={`pill ${
                        inspectedTx.isWekleProgram ? "cat-calendar" : "status-failed"
                      }`}
                    >
                      {inspectedTx.isWekleProgram ? "Contrato Wekle" : "Otro programa"}
                    </span>
                    {inspectedTx.category !== "unknown" && (
                      <span className={`pill cat-${inspectedTx.category}`}>
                        {inspectedTx.category === "calendar" ? "Calendario" : "Evento"}
                      </span>
                    )}
                    <span
                      className={`pill ${
                        inspectedTx.action !== "unknown"
                          ? `act-${inspectedTx.action}`
                          : "cat-event"
                      }`}
                    >
                      {inspectedTx.label}
                    </span>
                    <span className={`pill status-${inspectedTx.status}`}>
                      {inspectedTx.status === "confirmed" ? "Confirmada" : "Error"}
                    </span>
                  </div>

                  <p className="tx-detail">
                    Slot #{inspectedTx.slot} · Fee: {inspectedTx.feeLamports} lamports
                    {inspectedTx.signer ? ` · Firmante: ${shortKey(inspectedTx.signer)}` : ""}
                  </p>

                  <small className="tx-meta">
                    {inspectedTx.timestamp
                      ? `${formatTimestamp(inspectedTx.timestamp)} · `
                      : ""}
                    Firma: <code>{shortKey(inspectedTx.signature)}</code>
                  </small>

                  {inspectedTx.logs.length > 0 && (
                    <pre className="tx-logs">{inspectedTx.logs.join("\n")}</pre>
                  )}

                  <div className="tx-links inline-links">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => copySignature(inspectedTx.signature)}
                    >
                      {copiedSig === inspectedTx.signature ? "Copiado ✓" : "Copiar firma"}
                    </button>
                    <a
                      href={`https://explorer.solana.com/tx/${inspectedTx.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      className="explorer-link"
                    >
                      Ver en Explorer ↗
                    </a>
                  </div>
                </div>
              </article>
            )}

            {connected && (
              <div className="tx-list">
                <h3>Historial reciente de tu wallet</h3>
                {transactions.length === 0 ? (
                  <p className="muted">
                    No hay transacciones registradas todavía para este programa.
                  </p>
                ) : (
                  transactions.map((tx) => (
                    <article key={tx.signature} className="tx-card">
                      <div className="tx-info">
                        <div className="tx-badges">
                          <span className={`pill cat-${tx.category}`}>
                            {tx.category === "calendar" ? "Calendario" : "Evento"}
                          </span>
                          <span className={`pill act-${tx.action}`}>{tx.label}</span>
                          <span className={`pill status-${tx.status}`}>
                            {tx.status === "confirmed" ? "Confirmada" : "Error"}
                          </span>
                        </div>
                        <p className="tx-detail">{tx.detail}</p>
                        <small className="tx-meta">
                          {formatTimestamp(tx.timestamp)} · Firma:{" "}
                          <code>{shortKey(tx.signature)}</code>
                        </small>
                      </div>

                      <div className="tx-links">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => {
                            setSigQuery(tx.signature)
                            inspectTransaction(tx.signature)
                          }}
                        >
                          Logs
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => copySignature(tx.signature)}
                        >
                          {copiedSig === tx.signature ? "Copiado ✓" : "Copiar"}
                        </button>
                        <a
                          href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                          target="_blank"
                          rel="noreferrer"
                          className="explorer-link"
                        >
                          Explorer ↗
                        </a>
                      </div>
                    </article>
                  ))
                )}
              </div>
            )}
          </section>
        ) : !activeCalendar ? (
          <div className="empty-state">
            <h2>
              {loading
                ? "Cargando cuentas en Devnet..."
                : connected
                ? "Crea tu primer calendario"
                : "No hay calendarios públicos todavía"}
            </h2>
            <p>
              {connected
                ? "Usa el campo de la izquierda para empezar tu agenda on-chain."
                : "Conecta tu wallet Solflare para crear el primero o cambia a la pestaña Inspector de Transacciones."}
            </p>
          </div>
        ) : (
          <>
            {connected && (
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
            )}

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
                    {connected && (
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
                    )}
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
