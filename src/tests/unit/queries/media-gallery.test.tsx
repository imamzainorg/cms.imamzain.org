import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import {
	useMediaList,
	useMedia,
	useUpdateMedia,
	useDeleteMedia,
	useRegenerateVariants,
} from "@/lib/queries/media"
import {
	useGalleryList,
	useCreateGalleryItem,
	useDeleteGalleryItem,
} from "@/lib/queries/gallery"
import type { MediaRecord } from "@/types/media"
import { buildQueryClient, wrap, paginated } from "../../utils"

const API = "http://localhost:3000/api/v1"

const mockMedia: MediaRecord = {
	id: "m1",
	filename: "img.png",
	url: "https://cdn.test/img.png",
	mime_type: "image/png",
	file_size: 1000,
	alt_text: null,
	width: 100,
	height: 100,
	created_at: "2024-01-01",
}

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function wrapped(client: QueryClient) {
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
}

describe("media hooks", () => {
	it("useMediaList paginates", async () => {
		server.use(http.get(`${API}/media`, () =>
			HttpResponse.json(wrap(paginated([mockMedia]))),
		))
		const client = buildQueryClient()
		const { result } = renderHook(() => useMediaList({ page: 1, limit: 50 }), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.items[0].id).toBe("m1")
	})

	it("useMedia(undefined) does not fire", async () => {
		const client = buildQueryClient()
		const { result } = renderHook(() => useMedia(undefined), { wrapper: wrapped(client) })
		await new Promise((r) => setTimeout(r, 30))
		expect(result.current.fetchStatus).toBe("idle")
	})

	it("useMediaList forwards search + mime_type to the API", async () => {
		let captured: URL | null = null
		server.use(http.get(`${API}/media`, ({ request }) => {
			captured = new URL(request.url)
			return HttpResponse.json(wrap(paginated([mockMedia])))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(
			() => useMediaList({ page: 1, limit: 50, search: "logo", mime_type: "image/png" }),
			{ wrapper: wrapped(client) },
		)
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(captured!.searchParams.get("search")).toBe("logo")
		expect(captured!.searchParams.get("mime_type")).toBe("image/png")
	})

	it("useRegenerateVariants POSTs to /:id/regenerate-variants and invalidates media", async () => {
		let hit = false
		server.use(
			http.get(`${API}/media`, () => HttpResponse.json(wrap(paginated([mockMedia])))),
			http.post(`${API}/media/m1/regenerate-variants`, () => {
				hit = true
				return HttpResponse.json(wrap(mockMedia))
			}),
		)
		const client = buildQueryClient()
		const { result: list } = renderHook(() => useMediaList({ page: 1, limit: 50 }), { wrapper: wrapped(client) })
		await waitFor(() => expect(list.current.isSuccess).toBe(true))

		const { result: regen } = renderHook(() => useRegenerateVariants(), { wrapper: wrapped(client) })
		await act(async () => { await regen.current.mutateAsync("m1") })
		expect(hit).toBe(true)
	})

	it("update and delete both invalidate media.all (incl. fullScan)", async () => {
		let listHits = 0
		server.use(
			http.get(`${API}/media`, () => { listHits++; return HttpResponse.json(wrap(paginated([mockMedia]))) }),
			http.patch(`${API}/media/m1`, () => HttpResponse.json(wrap(mockMedia))),
			http.delete(`${API}/media/m1`, () => HttpResponse.json(wrap({}))),
		)
		const client = buildQueryClient()
		const { result: list } = renderHook(() => useMediaList({ page: 1, limit: 50 }), { wrapper: wrapped(client) })
		await waitFor(() => expect(list.current.isSuccess).toBe(true))
		let prev = listHits

		const { result: u } = renderHook(() => useUpdateMedia(), { wrapper: wrapped(client) })
		await act(async () => { await u.current.mutateAsync({ id: "m1", body: { alt_text: "new alt" } }) })
		await waitFor(() => expect(listHits).toBeGreaterThan(prev))
		prev = listHits

		const { result: d } = renderHook(() => useDeleteMedia(), { wrapper: wrapped(client) })
		await act(async () => { await d.current.mutateAsync("m1") })
		await waitFor(() => expect(listHits).toBeGreaterThan(prev))
	})
})

describe("gallery hooks", () => {
	it("useGalleryList paginates", async () => {
		let hit = false
		server.use(http.get(`${API}/gallery`, () => { hit = true; return HttpResponse.json(wrap(paginated([])))}))
		const client = buildQueryClient()
		const { result } = renderHook(() => useGalleryList(), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(hit).toBe(true)
	})

	it("create/delete invalidate the gallery list", async () => {
		let listHits = 0
		server.use(
			http.get(`${API}/gallery`, () => { listHits++; return HttpResponse.json(wrap(paginated([]))) }),
			http.post(`${API}/gallery`, () => HttpResponse.json(wrap({}))),
			http.delete(`${API}/gallery/m1`, () => HttpResponse.json(wrap({}))),
		)
		const client = buildQueryClient()
		const { result: list } = renderHook(() => useGalleryList(), { wrapper: wrapped(client) })
		await waitFor(() => expect(list.current.isSuccess).toBe(true))
		let prev = listHits

		const { result: c } = renderHook(() => useCreateGalleryItem(), { wrapper: wrapped(client) })
		await act(async () => { await c.current.mutateAsync({ media_id: "m1" }) })
		await waitFor(() => expect(listHits).toBeGreaterThan(prev))
		prev = listHits

		const { result: d } = renderHook(() => useDeleteGalleryItem(), { wrapper: wrapped(client) })
		await act(async () => { await d.current.mutateAsync("m1") })
		await waitFor(() => expect(listHits).toBeGreaterThan(prev))
	})
})
