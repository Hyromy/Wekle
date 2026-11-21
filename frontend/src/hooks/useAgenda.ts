import { useCallback, useEffect, useMemo, useState } from "react"
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor"
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react"
import { PublicKey, Transaction } from "@solana/web3.js"
import idl from "../idl/backend.json"
import type { Backend } from "../idl/backend"

export interface CalendarItem {
  publicKey: PublicKey
  id: BN
  name: string
  authority: PublicKey
}

export interface EventItem {
  publicKey: PublicKey
  id: BN
  calendar: PublicKey
  title: string
  content: string
  startAt: number
  endAt: number
  authority: PublicKey
}

export type TxCategory = "calendar" | "event"
export type TxAction = "create" | "update" | "delete"

export interface TxRecord {
  signature: string
  category: TxCategory
  action: TxAction
  label: string
  detail: string
  timestamp: number
  status: "confirmed" | "failed"
  slot?: number
}

export interface InspectedTx {
  signature: string
  isWekleProgram: boolean
  category: TxCategory | "unknown"
  action: TxAction | "unknown"
  label: string
  status: "confirmed" | "failed"
  slot: number
  timestamp: number | null
  feeLamports: number
  signer: string | null
  logs: string[]
}

interface StoredTxCache {
  records: TxRecord[]
  ignored: string[]
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function parseAnchorError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes("6000") || msg.includes("Empty")) {
    return "El título o nombre no puede estar vacío."
  }
  if (msg.includes("6001") || msg.includes("TittleTooLong")) {
    return "El título o nombre supera los 50 caracteres."
  }
  if (msg.includes("6002") || msg.includes("ContentTooLong")) {
    return "La descripción supera los 200 caracteres."
  }
  if (msg.includes("6003") || msg.includes("InvalidTimeRange")) {
    return "La fecha de fin debe ser igual o posterior a la de inicio."
  }
  return msg
}

function classifyFromLogs(
  logs: string[] | null | undefined,
  programId: string
): Pick<TxRecord, "category" | "action" | "label"> | null {
  if (!logs || !logs.some((l) => l.includes(programId))) return null

  if (logs.some((l) => l.includes("Instruction: DeleteCalendar"))) {
    return { category: "calendar", action: "delete", label: "Eliminar calendario" }
  }
  if (logs.some((l) => l.includes("Instruction: CreateCalendar"))) {
    return { category: "calendar", action: "create", label: "Crear calendario" }
  }
  if (logs.some((l) => l.includes("Instruction: UpdateCalendar"))) {
    return { category: "calendar", action: "update", label: "Editar calendario" }
  }
  if (logs.some((l) => l.includes("Instruction: CreateEvent"))) {
    return { category: "event", action: "create", label: "Crear evento" }
  }
  if (logs.some((l) => l.includes("Instruction: UpdateEvent"))) {
    return { category: "event", action: "update", label: "Editar evento" }
  }
  if (logs.some((l) => l.includes("Instruction: DeleteEvent"))) {
    return { category: "event", action: "delete", label: "Eliminar evento" }
  }
  return null
}

function loadCache(storageKey: string): StoredTxCache {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return { records: [], ignored: [] }
    const parsed = JSON.parse(raw) as StoredTxCache
    return {
      records: Array.isArray(parsed.records) ? parsed.records : [],
      ignored: Array.isArray(parsed.ignored) ? parsed.ignored : [],
    }
  } catch {
    return { records: [], ignored: [] }
  }
}

function saveCache(storageKey: string, cache: StoredTxCache) {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        records: cache.records.slice(0, 100),
        ignored: cache.ignored.slice(-150),
      })
    )
  } catch {
    // Ignorar si el almacenamiento del navegador está lleno
  }
}

export function useAgenda() {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()

  const [calendars, setCalendars] = useState<CalendarItem[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [transactions, setTransactions] = useState<TxRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [txPending, setTxPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [inspectedTx, setInspectedTx] = useState<InspectedTx | null>(null)
  const [inspecting, setInspecting] = useState(false)
  const [inspectError, setInspectError] = useState<string | null>(null)

  // Cliente de solo lectura disponible incluso sin wallet conectada
  const readProgram = useMemo(
    () => new Program<Backend>(idl as unknown as Backend, { connection }),
    [connection]
  )

  // Cliente con firma cuando Solflare está conectado
  const anchorCtx = useMemo(() => {
    if (!wallet) return null
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    })
    const program = new Program<Backend>(idl as unknown as Backend, provider)
    const storageKey = `wekle_txs_${program.programId.toBase58()}_${wallet.publicKey.toBase58()}`
    return { provider, program, storageKey }
  }, [connection, wallet])

  const recordTx = useCallback(
    (entry: TxRecord) => {
      if (!anchorCtx) return
      setTransactions((prev) => {
        const updated = [
          entry,
          ...prev.filter((item) => item.signature !== entry.signature),
        ].sort((a, b) => b.timestamp - a.timestamp)

        const cache = loadCache(anchorCtx.storageKey)
        saveCache(anchorCtx.storageKey, {
          records: updated,
          ignored: cache.ignored,
        })
        return updated
      })
    },
    [anchorCtx]
  )

  const syncHistory = useCallback(async () => {
    if (!anchorCtx || !wallet) return
    const { program, storageKey } = anchorCtx
    const programIdStr = program.programId.toBase58()

    const cache = loadCache(storageKey)
    setTransactions(cache.records)

    try {
      const sigInfos = await connection.getSignaturesForAddress(wallet.publicKey, {
        limit: 15,
      })

      const knownSigs = new Set([
        ...cache.records.map((r) => r.signature),
        ...cache.ignored,
      ])

      const unknownSigs = sigInfos.filter((s) => !knownSigs.has(s.signature))
      if (unknownSigs.length === 0) return

      const newRecords: TxRecord[] = []
      const newIgnored: string[] = []

      for (const info of unknownSigs) {
        try {
          await sleep(350)
          const tx = await connection.getTransaction(info.signature, {
            maxSupportedTransactionVersion: 0,
          })
          if (!tx) continue

          const meta = classifyFromLogs(tx.meta?.logMessages, programIdStr)
          if (!meta) {
            newIgnored.push(info.signature)
            continue
          }

          newRecords.push({
            signature: info.signature,
            category: meta.category,
            action: meta.action,
            label: meta.label,
            detail: `Transacción histórica (Slot #${tx.slot})`,
            timestamp: tx.blockTime ?? info.blockTime ?? Math.floor(Date.now() / 1000),
            status: tx.meta?.err ? "failed" : "confirmed",
            slot: tx.slot,
          })
        } catch {
          break
        }
      }

      if (newRecords.length > 0 || newIgnored.length > 0) {
        const mergedRecords = [...newRecords, ...cache.records]
          .filter(
            (item, index, arr) =>
              arr.findIndex((x) => x.signature === item.signature) === index
          )
          .sort((a, b) => b.timestamp - a.timestamp)

        saveCache(storageKey, {
          records: mergedRecords,
          ignored: [...cache.ignored, ...newIgnored],
        })
        setTransactions(mergedRecords)
      }
    } catch {
      // El historial on-chain es secundario no bloquea el uso de la agenda
    }
  }, [anchorCtx, wallet, connection])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const activeProgram = anchorCtx?.program ?? readProgram
      const [rawCalendars, rawEvents] = await Promise.all([
        activeProgram.account.calendar.all(),
        activeProgram.account.event.all(),
      ])

      // Con wallet: filtra solo los del usuario sin wallet: muestra todos en modo público
      const filteredCalendars = wallet
        ? rawCalendars.filter((c) => c.account.authority.equals(wallet.publicKey))
        : rawCalendars

      const filteredEvents = wallet
        ? rawEvents.filter((e) => e.account.authority.equals(wallet.publicKey))
        : rawEvents

      setCalendars(
        filteredCalendars
          .map((c) => ({
            publicKey: c.publicKey,
            id: c.account.id,
            name: c.account.name,
            authority: c.account.authority,
          }))
          .sort((a, b) => a.id.cmp(b.id))
      )

      setEvents(
        filteredEvents
          .map((e) => ({
            publicKey: e.publicKey,
            id: e.account.id,
            calendar: e.account.calendar,
            title: e.account.title,
            content: e.account.content,
            startAt: e.account.startAt.toNumber(),
            endAt: e.account.endAt.toNumber(),
            authority: e.account.authority,
          }))
          .sort((a, b) => a.startAt - b.startAt)
      )
    } catch (err) {
      setError(parseAnchorError(err))
    } finally {
      setLoading(false)
    }

    if (wallet) {
      await syncHistory()
    } else {
      setTransactions([])
    }
  }, [anchorCtx, readProgram, wallet, syncHistory])

  useEffect(() => {
    refresh()
  }, [refresh])

  const inspectTransaction = useCallback(
    async (rawSignature: string) => {
      const signature = rawSignature.trim()
      if (!signature) return

      setInspecting(true)
      setInspectError(null)
      try {
        const tx = await connection.getTransaction(signature, {
          maxSupportedTransactionVersion: 0,
        })

        if (!tx) {
          setInspectedTx(null)
          setInspectError("No se encontró la transacción en Devnet. Revisa que la firma sea correcta.")
          return
        }

        const programId = readProgram.programId
        const programIdStr = programId.toBase58()
        const logs = tx.meta?.logMessages ?? []
        const accountKeys = tx.transaction.message.getAccountKeys().staticAccountKeys

        const isWekleProgram =
          logs.some((l) => l.includes(programIdStr)) ||
          accountKeys.some((k) => k.equals(programId))

        const classified = classifyFromLogs(logs, programIdStr)

        setInspectedTx({
          signature,
          isWekleProgram,
          category: classified?.category ?? "unknown",
          action: classified?.action ?? "unknown",
          label: classified?.label ?? (isWekleProgram ? "Instrucción de Wekle" : "Programa externo"),
          status: tx.meta?.err ? "failed" : "confirmed",
          slot: tx.slot,
          timestamp: tx.blockTime ?? null,
          feeLamports: tx.meta?.fee ?? 0,
          signer: accountKeys[0]?.toBase58() ?? null,
          logs,
        })
      } catch (err) {
        setInspectedTx(null)
        setInspectError(
          err instanceof Error
            ? `Error al consultar la firma: ${err.message}`
            : "Firma inválida o error de red en Devnet."
        )
      } finally {
        setInspecting(false)
      }
    },
    [connection, readProgram]
  )

  const runTx = async (fn: () => Promise<void>) => {
    setTxPending(true)
    setError(null)
    try {
      await fn()
      await refresh()
    } catch (err) {
      setError(parseAnchorError(err))
      throw err
    } finally {
      setTxPending(false)
    }
  }

  // --- Calendarios ---
  const createCalendar = (name: string) =>
    runTx(async () => {
      if (!anchorCtx) return
      const id = new BN(Date.now())
      const signature = await anchorCtx.program.methods
        .createCalendar(id, name)
        .rpc()
      recordTx({
        signature,
        category: "calendar",
        action: "create",
        label: "Crear calendario",
        detail: `Calendario: "${name}"`,
        timestamp: Math.floor(Date.now() / 1000),
        status: "confirmed",
      })
    })

  const updateCalendar = (calendar: PublicKey, name: string) =>
    runTx(async () => {
      if (!anchorCtx) return
      const signature = await anchorCtx.program.methods
        .updateCalendar(name)
        .accountsPartial({ calendar })
        .rpc()
      recordTx({
        signature,
        category: "calendar",
        action: "update",
        label: "Editar calendario",
        detail: `Nuevo nombre: "${name}"`,
        timestamp: Math.floor(Date.now() / 1000),
        status: "confirmed",
      })
    })

  const deleteCalendar = (calendar: PublicKey) =>
    runTx(async () => {
      if (!anchorCtx) return
      const { program, provider } = anchorCtx
      const tx = new Transaction()
      const targetCal = calendars.find((c) => c.publicKey.equals(calendar))
      const childEvents = events.filter((e) => e.calendar.equals(calendar))

      for (const ev of childEvents) {
        const ix = await program.methods
          .deleteEvent()
          .accountsPartial({ event: ev.publicKey })
          .instruction()
        tx.add(ix)
      }

      const delCalIx = await program.methods
        .deleteCalendar()
        .accountsPartial({ calendar })
        .instruction()
      tx.add(delCalIx)

      const signature = await provider.sendAndConfirm(tx)
      recordTx({
        signature,
        category: "calendar",
        action: "delete",
        label: "Eliminar calendario",
        detail: `"${targetCal?.name ?? "Calendario"}" (${childEvents.length} eventos cerrados)`,
        timestamp: Math.floor(Date.now() / 1000),
        status: "confirmed",
      })
    })

  // --- Eventos ---
  const createEvent = (
    calendar: PublicKey,
    title: string,
    content: string,
    startAt: number,
    endAt: number
  ) =>
    runTx(async () => {
      if (!anchorCtx) return
      const id = new BN(Date.now())
      const calName = calendars.find((c) => c.publicKey.equals(calendar))?.name
      const signature = await anchorCtx.program.methods
        .createEvent(id, title, content, new BN(startAt), new BN(endAt))
        .accountsPartial({ calendar })
        .rpc()
      recordTx({
        signature,
        category: "event",
        action: "create",
        label: "Crear evento",
        detail: `"${title}"${calName ? ` en ${calName}` : ""}`,
        timestamp: Math.floor(Date.now() / 1000),
        status: "confirmed",
      })
    })

  const updateEvent = (
    event: PublicKey,
    title: string,
    content: string,
    startAt: number,
    endAt: number
  ) =>
    runTx(async () => {
      if (!anchorCtx) return
      const signature = await anchorCtx.program.methods
        .updateEvent(title, content, new BN(startAt), new BN(endAt))
        .accountsPartial({ event })
        .rpc()
      recordTx({
        signature,
        category: "event",
        action: "update",
        label: "Editar evento",
        detail: `Evento actualizado: "${title}"`,
        timestamp: Math.floor(Date.now() / 1000),
        status: "confirmed",
      })
    })

  const deleteEvent = (event: PublicKey) =>
    runTx(async () => {
      if (!anchorCtx) return
      const targetEv = events.find((e) => e.publicKey.equals(event))
      const signature = await anchorCtx.program.methods
        .deleteEvent()
        .accountsPartial({ event })
        .rpc()
      recordTx({
        signature,
        category: "event",
        action: "delete",
        label: "Eliminar evento",
        detail: `Evento eliminado: "${targetEv?.title ?? event.toBase58().slice(0, 8)}"`,
        timestamp: Math.floor(Date.now() / 1000),
        status: "confirmed",
      })
    })

  return {
    connected: Boolean(wallet),
    programId: readProgram.programId.toBase58(),
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
  }
}
