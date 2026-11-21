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

export function useAgenda() {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()

  const [calendars, setCalendars] = useState<CalendarItem[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(false)
  const [txPending, setTxPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const anchorCtx = useMemo(() => {
    if (!wallet) return null
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    })
    const program = new Program<Backend>(idl as unknown as Backend, provider)
    return { provider, program }
  }, [connection, wallet])

  const refresh = useCallback(async () => {
    if (!anchorCtx || !wallet) {
      setCalendars([])
      setEvents([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { program } = anchorCtx
      const [rawCalendars, rawEvents] = await Promise.all([
        program.account.calendar.all(),
        program.account.event.all(),
      ])

      const userCalendars = rawCalendars
        .filter((c) => c.account.authority.equals(wallet.publicKey))
        .map((c) => ({
          publicKey: c.publicKey,
          id: c.account.id,
          name: c.account.name,
          authority: c.account.authority,
        }))
        .sort((a, b) => a.id.cmp(b.id))

      const userEvents = rawEvents
        .filter((e) => e.account.authority.equals(wallet.publicKey))
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

      setCalendars(userCalendars)
      setEvents(userEvents)
    } catch (err) {
      setError(parseAnchorError(err))
    } finally {
      setLoading(false)
    }
  }, [anchorCtx, wallet])

  useEffect(() => {
    refresh()
  }, [refresh])

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
      await anchorCtx.program.methods.createCalendar(id, name).rpc()
    })

  const updateCalendar = (calendar: PublicKey, name: string) =>
    runTx(async () => {
      if (!anchorCtx) return
      await anchorCtx.program.methods
        .updateCalendar(name)
        .accountsPartial({ calendar })
        .rpc()
    })

  const deleteCalendar = (calendar: PublicKey) =>
    runTx(async () => {
      if (!anchorCtx) return
      const { program, provider } = anchorCtx
      const tx = new Transaction()
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

      await provider.sendAndConfirm(tx)
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
      await anchorCtx.program.methods
        .createEvent(id, title, content, new BN(startAt), new BN(endAt))
        .accountsPartial({ calendar })
        .rpc()
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
      await anchorCtx.program.methods
        .updateEvent(title, content, new BN(startAt), new BN(endAt))
        .accountsPartial({ event })
        .rpc()
    })

  const deleteEvent = (event: PublicKey) =>
    runTx(async () => {
      if (!anchorCtx) return
      await anchorCtx.program.methods
        .deleteEvent()
        .accountsPartial({ event })
        .rpc()
    })

  return {
    connected: Boolean(wallet),
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
  }
}
