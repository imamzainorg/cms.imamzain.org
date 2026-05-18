import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, type RenderOptions, type RenderResult } from "@testing-library/react"

/**
 * Build a QueryClient configured for tests:
 *   - no retries (so failures surface fast)
 *   - no caching across renders (gcTime: 0)
 *   - no window-focus refetch (jsdom isn't a real window)
 */
export function buildQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0, staleTime: 0, refetchOnWindowFocus: false },
			mutations: { retry: false },
		},
	})
}

/**
 * Render a component wrapped in QueryClientProvider. Returns the rendered
 * result plus the QueryClient instance so tests can assert on cache state.
 */
export function renderWithQueryClient(
	ui: ReactNode,
	options?: RenderOptions & { client?: QueryClient },
): RenderResult & { client: QueryClient } {
	const client = options?.client ?? buildQueryClient()
	const result = render(
		<QueryClientProvider client={client}>{ui}</QueryClientProvider>,
		options,
	)
	return Object.assign(result, { client })
}

/** Wrap a payload the same way the real backend envelope does. */
export function wrap<T>(data: T) {
	return { success: true, timestamp: new Date().toISOString(), message: "OK", data }
}

/** Build a paginated response matching `PaginatedResponse<T>`. */
export function paginated<T>(items: T[], opts: { page?: number; limit?: number; total?: number } = {}) {
	const total = opts.total ?? items.length
	const limit = opts.limit ?? 20
	const page = opts.page ?? 1
	return {
		items,
		pagination: {
			page,
			limit,
			total,
			pages: Math.max(1, Math.ceil(total / limit)),
		},
	}
}
