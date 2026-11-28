import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { navigationMock, resetNavigationMocks } from "../../mocks/next-navigation"

vi.mock("next/navigation", () => navigationMock)

import GalleryPage from "@/app/(dashboard)/dashboard/gallery/page"
import { renderWithQueryClient, wrap, paginated } from "../../utils"

const API = "http://localhost:3000/api/v1"

const image = (id: string, title: string, is_published: boolean) => ({
	media_id: id,
	is_published,
	tags: [],
	views: 0,
	media: null,
	gallery_image_translations: [{ lang: "ar", title }],
	translation: null,
})

let queries: string[] = []

const server = setupServer(
	http.get(`${API}/gallery-categories`, () => HttpResponse.json(wrap(paginated([])))),
	http.get(`${API}/gallery/admin`, ({ request }) => {
		const params = new URL(request.url).searchParams
		queries.push(params.toString())
		const page = Number(params.get("page"))
		const items = params.get("is_published") !== "false"
			? [image("live", "صورة منشورة", true)]
			: page === 2
				? [image("old", "مسودة قديمة", false)]
				: [image("new", "مسودة حديثة", false)]
		return HttpResponse.json(wrap(paginated(items, { page, limit: 100, total: items[0].is_published ? 1 : 101 })))
	}),
)
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => { queries = []; server.resetHandlers(); resetNavigationMocks() })
afterAll(() => server.close())

describe("GalleryPage", () => {
	it("asks the API for drafts, pages through older ones, and returns to page 1 on a new filter", async () => {
		renderWithQueryClient(<GalleryPage />)
		await screen.findByText("صورة منشورة")
		expect(queries.at(-1)).toBe("page=1&limit=100")

		await userEvent.click(screen.getByRole("button", { name: "مسودة" }))
		await screen.findByText("مسودة حديثة")
		expect(queries.at(-1)).toBe("page=1&limit=100&is_published=false")

		await userEvent.click(screen.getByRole("button", { name: /التالي/ }))
		await screen.findByText("مسودة قديمة")
		expect(queries.at(-1)).toBe("page=2&limit=100&is_published=false")

		await userEvent.click(screen.getByRole("button", { name: "منشور" }))
		await screen.findByText("صورة منشورة")
		expect(queries.at(-1)).toBe("page=1&limit=100&is_published=true")
	})
})
