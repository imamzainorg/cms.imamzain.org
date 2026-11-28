"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { DefaultValues, FieldValues, UseFormReturn } from "react-hook-form"
import { useAuthStore } from "@/store/auth"

const PREFIX = "cms:draft:"
const SAVE_DELAY_MS = 400

/** Form values with everything an untouched field can hold removed, in a stable key order. */
function meaningful(value: unknown): unknown {
	if (value === "" || value === "<p></p>" || value === null || value === undefined) return undefined
	if (Array.isArray(value)) return value.length ? value.map((v) => meaningful(v) ?? null) : undefined
	if (typeof value !== "object") return value
	const entries = Object.keys(value)
		.sort()
		.map((k) => [k, meaningful((value as Record<string, unknown>)[k])] as const)
		.filter(([, v]) => v !== undefined)
	return entries.length ? Object.fromEntries(entries) : undefined
}

const fingerprint = (values: unknown) => JSON.stringify(meaningful(values) ?? null)

/**
 * Keeps a half-written "new record" form in this browser, so a refresh, a closed tab or a click on
 * another page loses nothing. The copy is per signed-in user, is restored the next time the same
 * form opens, and is dropped once the record is saved.
 *
 * `name` identifies the form; pass null to switch it off (editing an existing record). Call it after
 * `useFieldArray`, so a restored list of translations reaches the fields.
 */
export function useFormDraft<T extends FieldValues>(
	name: string | null,
	form: Pick<UseFormReturn<T>, "watch" | "getValues" | "reset">,
	blankValues: () => T,
) {
	const userId = useAuthStore((s) => s.user?.id) ?? "anonymous"
	const key = name ? `${PREFIX}${userId}:${name}` : null
	const [restoredAt, setRestoredAt] = useState<string | null>(null)
	const restored = useRef(false)
	const done = useRef(false)
	const [initial] = useState(blankValues)
	const blank = useRef<T>(initial)
	const formRef = useRef(form)

	useEffect(() => {
		formRef.current = form
	})

	useEffect(() => {
		if (!key) return
		const { watch, getValues, reset } = formRef.current
		done.current = false
		// undefined: nothing waiting to be written. null: the form is back to blank.
		let pending: string | null | undefined
		let timer: ReturnType<typeof setTimeout> | undefined

		const flush = () => {
			clearTimeout(timer)
			if (done.current || pending === undefined) return
			try {
				if (pending === null) localStorage.removeItem(key)
				else localStorage.setItem(key, pending)
			} catch {
				// Storage full or blocked: the form still works, it just isn't kept.
			}
			pending = undefined
		}

		try {
			const saved = JSON.parse(localStorage.getItem(key) ?? "null")
			if (saved?.values) {
				restored.current = true
				reset({ ...blank.current, ...saved.values }, { keepDefaultValues: true })
				// Browser storage can only be read once mounted, so this is a one-off sync with it.
				// eslint-disable-next-line react-hooks/set-state-in-effect
				setRestoredAt(saved.savedAt)
			}
		} catch {
			// An unreadable copy is ignored and overwritten by the next change.
		}

		const subscription = watch(() => {
			const values = getValues()
			pending = fingerprint(values) === fingerprint(blank.current)
				? null
				: JSON.stringify({ savedAt: new Date().toISOString(), values })
			clearTimeout(timer)
			timer = setTimeout(flush, SAVE_DELAY_MS)
		})
		window.addEventListener("pagehide", flush)
		return () => {
			// Leaving the page inside the delay still saves the last keystrokes.
			flush()
			subscription.unsubscribe()
			window.removeEventListener("pagehide", flush)
		}
	}, [key])

	/** After a successful save: forget the copy and stop writing it. */
	const clear = useCallback(() => {
		done.current = true
		if (key) localStorage.removeItem(key)
	}, [key])

	/** The editor's "start over". */
	const discard = useCallback(() => {
		restored.current = false
		setRestoredAt(null)
		formRef.current.reset(blank.current as DefaultValues<T>)
		if (key) localStorage.removeItem(key)
	}, [key])

	/** For a form that fills itself in after opening: what now counts as untouched. */
	const setBlank = useCallback((values: T) => {
		blank.current = values
	}, [])

	return { enabled: !!key, restoredAt, restored, clear, discard, setBlank }
}
