import { describe, it, expect } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { useListPage } from "@/lib/use-list-page"

describe("useListPage", () => {
	it("debounces search input into debouncedSearch and resets page to 1", async () => {
		const { result } = renderHook(() => useListPage({ debounceMs: 50 }))
		act(() => result.current.setPage(3))
		expect(result.current.page).toBe(3)

		act(() => result.current.setSearch("hello"))
		// debouncedSearch trails the raw search by debounceMs.
		expect(result.current.debouncedSearch).toBe("")
		await waitFor(() => {
			expect(result.current.debouncedSearch).toBe("hello")
		})
		expect(result.current.page).toBe(1)
	})

	it("setLimit resets page to 1", () => {
		const { result } = renderHook(() => useListPage())
		act(() => result.current.setPage(5))
		expect(result.current.page).toBe(5)
		act(() => result.current.setLimit(50))
		expect(result.current.page).toBe(1)
		expect(result.current.limit).toBe(50)
	})

	it("toggleSelected / clearSelected / selectMany manage the selection Set", () => {
		const { result } = renderHook(() => useListPage())
		act(() => result.current.toggleSelected("a"))
		act(() => result.current.toggleSelected("b"))
		expect(Array.from(result.current.selected).sort()).toEqual(["a", "b"])

		act(() => result.current.toggleSelected("a"))
		expect(Array.from(result.current.selected)).toEqual(["b"])

		act(() => result.current.selectMany(["x", "y", "z"]))
		expect(Array.from(result.current.selected).sort()).toEqual(["x", "y", "z"])

		act(() => result.current.clearSelected())
		expect(result.current.selected.size).toBe(0)
	})

	it("resetPageAndSelection clears page + selection together", () => {
		const { result } = renderHook(() => useListPage())
		act(() => {
			result.current.setPage(4)
			result.current.selectMany(["a", "b"])
		})
		act(() => result.current.resetPageAndSelection())
		expect(result.current.page).toBe(1)
		expect(result.current.selected.size).toBe(0)
	})

	it("hydrates viewMode from localStorage on mount", () => {
		localStorage.setItem("test:view", "grid")
		const { result } = renderHook(() => useListPage({ viewStorageKey: "test:view" }))
		// useEffect runs after mount; trigger a tick.
		expect(result.current.viewMode).toBe("grid")
		localStorage.removeItem("test:view")
	})

	it("setView writes back to localStorage when a key is configured", () => {
		localStorage.clear()
		const { result } = renderHook(() => useListPage({ viewStorageKey: "test:view2" }))
		act(() => result.current.setView("grid"))
		expect(localStorage.getItem("test:view2")).toBe("grid")
		act(() => result.current.setView("table"))
		expect(localStorage.getItem("test:view2")).toBe("table")
		localStorage.removeItem("test:view2")
	})

	it("does not touch localStorage when no viewStorageKey is configured", () => {
		localStorage.clear()
		const { result } = renderHook(() => useListPage())
		act(() => result.current.setView("grid"))
		expect(localStorage.length).toBe(0)
	})
})
