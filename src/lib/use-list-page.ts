"use client"

import { useCallback, useEffect, useState } from "react"

export type ViewMode = "table" | "grid"

type Options = {
	/** Default `limit` for the first render. */
	initialLimit?: number
	/** Debounce window for the search-text → debouncedSearch promotion. */
	debounceMs?: number
	/** If provided, viewMode persists to localStorage under this key. */
	viewStorageKey?: string
	/** Initial view mode if no localStorage value is present. */
	initialView?: ViewMode
}

/**
 * Shared state machinery for any operator-facing list page. Replaces the
 * dozen-or-so identical-shape useState blocks across posts/users/contacts/
 * audit-logs/gallery/daily-hadiths.
 *
 * Owns:
 *   - `page` + `limit` (with `setLimit` resetting page to 1)
 *   - debounced `search`
 *   - multi-select Set + helpers
 *   - persisted `viewMode` toggle
 *   - `resetPageAndSelection()` — called when a filter changes
 *
 * NOT owned: per-page filter state (statusFilter, categoryFilter, etc.) —
 * each page declares those itself and pipes them through
 * `resetPageAndSelection()`.
 */
export function useListPage(opts: Options = {}) {
	const {
		initialLimit = 20,
		debounceMs = 300,
		viewStorageKey,
		initialView = "table",
	} = opts

	const [page, setPage] = useState(1)
	const [limit, setLimitState] = useState(initialLimit)
	const [search, setSearch] = useState("")
	const [debouncedSearch, setDebouncedSearch] = useState("")
	const [selected, setSelected] = useState<Set<string>>(new Set())
	const [viewMode, setViewMode] = useState<ViewMode>(initialView)

	// Hydrate viewMode from localStorage on mount. Runs once; subsequent
	// changes write through `setView()` below.
	useEffect(() => {
		if (!viewStorageKey) return
		try {
			const stored = window.localStorage.getItem(viewStorageKey)
			if (stored === "table" || stored === "grid") setViewMode(stored)
		} catch {
			/* SSR or storage disabled */
		}
	}, [viewStorageKey])

	// Debounce search → debouncedSearch and reset page when the user types.
	useEffect(() => {
		const t = setTimeout(() => {
			setDebouncedSearch(search.trim())
			setPage(1)
		}, debounceMs)
		return () => clearTimeout(t)
	}, [search, debounceMs])

	const setLimit = useCallback((n: number) => {
		setLimitState(n)
		setPage(1)
	}, [])

	const setView = useCallback(
		(mode: ViewMode) => {
			setViewMode(mode)
			if (viewStorageKey) {
				try {
					window.localStorage.setItem(viewStorageKey, mode)
				} catch {
					/* ignore */
				}
			}
		},
		[viewStorageKey],
	)

	const toggleSelected = useCallback((id: string) => {
		setSelected((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}, [])

	const clearSelected = useCallback(() => setSelected(new Set()), [])

	const selectMany = useCallback((ids: string[]) => {
		setSelected(new Set(ids))
	}, [])

	/** Call this from filter-change handlers so page resets to 1 and any
	 *  selection (which is page-scoped) clears. */
	const resetPageAndSelection = useCallback(() => {
		setPage(1)
		setSelected(new Set())
	}, [])

	return {
		page,
		setPage,
		limit,
		setLimit,
		search,
		setSearch,
		debouncedSearch,
		selected,
		setSelected,
		toggleSelected,
		clearSelected,
		selectMany,
		viewMode,
		setView,
		resetPageAndSelection,
	}
}
