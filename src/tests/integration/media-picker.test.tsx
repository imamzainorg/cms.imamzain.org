import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { screen, waitFor, fireEvent, act } from "@testing-library/react"

import MediaPicker from "@/components/ui/MediaPicker"
import { renderWithQueryClient, wrap, paginated } from "../utils"

const API = "http://localhost:3000/api/v1"

const mockImage = {
	id: "m1",
	filename: "shrine-photo.jpg",
	url: "https://cdn.example.com/m1.jpg",
	mime_type: "image/jpeg",
	file_size: 102400,
	alt_text: null,
	width: 1920,
	height: 1080,
	created_at: "2024-01-01T00:00:00Z",
	variants: [],
}

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("MediaPicker", () => {
	it("passes the typed search term as ?search= after the debounce", async () => {
		// Record every captured ?search= value so we can assert on the
		// debounced behavior — not just that the picker mounts.
		const searches: (string | null)[] = []
		server.use(
			http.get(`${API}/media`, ({ request }) => {
				searches.push(new URL(request.url).searchParams.get("search"))
				return HttpResponse.json(wrap(paginated([mockImage])))
			}),
		)

		renderWithQueryClient(
			<MediaPicker open={true} onClose={() => {}} onSelect={() => {}} />,
		)

		// Initial mount fires one request with no search param.
		await waitFor(() => expect(searches.length).toBeGreaterThan(0))
		expect(searches[0]).toBeNull()

		const input = screen.getByPlaceholderText("ابحث باسم الملف...")
		await act(async () => {
			fireEvent.change(input, { target: { value: "shrine" } })
		})

		// The debounce window is 300ms; waitFor polls past that.
		await waitFor(
			() => {
				expect(searches[searches.length - 1]).toBe("shrine")
			},
			{ timeout: 1000 },
		)
	})

	it("does NOT issue one request per keystroke (debounce holds)", async () => {
		let hits = 0
		server.use(
			http.get(`${API}/media`, () => {
				hits++
				return HttpResponse.json(wrap(paginated([])))
			}),
		)

		renderWithQueryClient(
			<MediaPicker open={true} onClose={() => {}} onSelect={() => {}} />,
		)
		await waitFor(() => expect(hits).toBeGreaterThan(0))
		const baseline = hits

		const input = screen.getByPlaceholderText("ابحث باسم الملف...")
		// Five rapid keystrokes; the debounce should collapse them into
		// at most one additional request once the timer fires.
		await act(async () => {
			fireEvent.change(input, { target: { value: "s" } })
			fireEvent.change(input, { target: { value: "sh" } })
			fireEvent.change(input, { target: { value: "shr" } })
			fireEvent.change(input, { target: { value: "shri" } })
			fireEvent.change(input, { target: { value: "shrine" } })
		})

		await waitFor(
			() => {
				expect(hits).toBeGreaterThan(baseline)
			},
			{ timeout: 1000 },
		)
		// Five keystrokes must NOT produce five new requests.
		expect(hits - baseline).toBeLessThanOrEqual(2)
	})
})
