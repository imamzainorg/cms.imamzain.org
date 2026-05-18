import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import {
	usePostsList,
	usePost,
	useDeletePost,
	useTogglePublishPost,
} from "@/lib/queries/posts"
import { queryKeys } from "@/lib/queries/keys"
import type { Post } from "@/types/posts"
import type { PaginatedResponse } from "@/types/pagination"
import { buildQueryClient, wrap, paginated } from "../../utils"

const API = "http://localhost:3000/api/v1"

const mockPost: Post = {
	id: "p1",
	category_id: "c1",
	cover_image_id: null,
	is_published: false,
	published_at: null,
	views: 0,
	created_at: "2024-01-01",
	updated_at: "2024-01-01",
	post_translations: [
		{ lang: "ar", title: "عنوان", summary: null, body: "x", slug: "title", is_default: true },
	],
	translation: { lang: "ar", title: "عنوان", summary: null, body: "x", slug: "title", is_default: true },
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

describe("usePostsList", () => {
	it("fetches a list and returns the paginated payload", async () => {
		server.use(http.get(`${API}/posts/admin`, () =>
			HttpResponse.json(wrap(paginated([mockPost]))),
		))
		const client = buildQueryClient()
		const { result } = renderHook(() => usePostsList({ page: 1, limit: 20 }), {
			wrapper: wrapped(client),
		})
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.items).toHaveLength(1)
		expect(result.current.data?.items[0].id).toBe("p1")
		expect(result.current.data?.pagination.total).toBe(1)
	})

	it("sends search/category/page params to the API", async () => {
		let captured: URL | null = null
		server.use(http.get(`${API}/posts/admin`, ({ request }) => {
			captured = new URL(request.url)
			return HttpResponse.json(wrap(paginated([])))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(
			() => usePostsList({ page: 2, limit: 50, search: "hello", category_id: "c1" }),
			{ wrapper: wrapped(client) },
		)
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(captured!.searchParams.get("page")).toBe("2")
		expect(captured!.searchParams.get("limit")).toBe("50")
		expect(captured!.searchParams.get("search")).toBe("hello")
		expect(captured!.searchParams.get("category_id")).toBe("c1")
	})
})

describe("usePost", () => {
	it("does NOT fire when id is undefined", async () => {
		let called = false
		server.use(http.get(`${API}/posts/admin/:id`, () => {
			called = true
			return HttpResponse.json(wrap(mockPost))
		}))
		const client = buildQueryClient()
		renderHook(() => usePost(undefined), { wrapper: wrapped(client) })
		// give it a tick
		await new Promise((r) => setTimeout(r, 30))
		expect(called).toBe(false)
	})

	it("fetches a single post by id", async () => {
		server.use(http.get(`${API}/posts/admin/p1`, () => HttpResponse.json(wrap(mockPost))))
		const client = buildQueryClient()
		const { result } = renderHook(() => usePost("p1"), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.id).toBe("p1")
	})
})

describe("useDeletePost", () => {
	it("invalidates the posts list cache on success", async () => {
		server.use(
			http.get(`${API}/posts/admin`, () => HttpResponse.json(wrap(paginated([mockPost])))),
			http.delete(`${API}/posts/p1`, () => HttpResponse.json(wrap({ message: "ok" }))),
		)
		const client = buildQueryClient()
		const { result: listResult } = renderHook(() => usePostsList({ page: 1, limit: 20 }), {
			wrapper: wrapped(client),
		})
		await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

		const { result: mutResult } = renderHook(() => useDeletePost(), { wrapper: wrapped(client) })
		await act(async () => { await mutResult.current.mutateAsync("p1") })
		// after invalidation the list refetches
		await waitFor(() =>
			expect(client.getQueryState(queryKeys.posts.list({ page: 1, limit: 20 }))?.isInvalidated)
				.toBe(false), // refetch completed
		)
		expect(mutResult.current.isSuccess).toBe(true)
	})
})

describe("useTogglePublishPost", () => {
	it("optimistically flips is_published in every cached list page", async () => {
		// Backend delays its response so we can observe the optimistic state mid-flight.
		let resolveServer: (() => void) | undefined
		server.use(
			http.get(`${API}/posts/admin`, () => HttpResponse.json(wrap(paginated([mockPost])))),
			http.patch(`${API}/posts/p1/publish`, async () => {
				await new Promise<void>((r) => { resolveServer = r })
				return HttpResponse.json(wrap({ ...mockPost, is_published: true }))
			}),
		)
		const client = buildQueryClient()
		const { result: list } = renderHook(() => usePostsList({ page: 1, limit: 20 }), {
			wrapper: wrapped(client),
		})
		await waitFor(() => expect(list.current.isSuccess).toBe(true))
		expect(list.current.data?.items[0].is_published).toBe(false)

		const { result: mut } = renderHook(() => useTogglePublishPost(), {
			wrapper: wrapped(client),
		})
		act(() => { mut.current.mutate({ id: "p1", is_published: true }) })

		// optimistic update applied immediately, before the server responds
		await waitFor(() => {
			const cache = client.getQueryData<PaginatedResponse<Post>>(
				queryKeys.posts.list({ page: 1, limit: 20 }),
			)
			expect(cache?.items[0].is_published).toBe(true)
		})

		// now let the server complete
		resolveServer?.()
		await waitFor(() => expect(mut.current.isSuccess).toBe(true))
	})

	it("rolls back the optimistic update on server error", async () => {
		server.use(
			http.get(`${API}/posts/admin`, () => HttpResponse.json(wrap(paginated([mockPost])))),
			http.patch(`${API}/posts/p1/publish`, () =>
				HttpResponse.json({ error: "no" }, { status: 500 }),
			),
		)
		const client = buildQueryClient()
		const { result: list } = renderHook(() => usePostsList({ page: 1, limit: 20 }), {
			wrapper: wrapped(client),
		})
		await waitFor(() => expect(list.current.isSuccess).toBe(true))

		const { result: mut } = renderHook(() => useTogglePublishPost(), {
			wrapper: wrapped(client),
		})
		await act(async () => {
			try { await mut.current.mutateAsync({ id: "p1", is_published: true }) } catch {}
		})

		// after error + onSettled refetch, the original (false) value should be back
		await waitFor(() => {
			const cache = client.getQueryData<PaginatedResponse<Post>>(
				queryKeys.posts.list({ page: 1, limit: 20 }),
			)
			expect(cache?.items[0].is_published).toBe(false)
		})
	})
})
