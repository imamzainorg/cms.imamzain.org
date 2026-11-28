import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest"
import userEvent from "@testing-library/user-event"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { screen, waitFor } from "@testing-library/react"
import { navigationMock, resetNavigationMocks } from "../mocks/next-navigation"

vi.mock("next/navigation", () => navigationMock)

import PostForm from "@/components/posts/PostForm"
import AttachmentsInput from "@/components/ui/AttachmentsInput"
import type { Post } from "@/types"
import { renderWithQueryClient, wrap, paginated } from "../utils"

const API = "http://localhost:3000/api/v1"
const CATEGORY = "11111111-1111-4111-8111-111111111111"
const COVER = "22222222-2222-4222-8222-222222222222"

const file = (id: string, filename: string) => ({
	id,
	filename,
	url: `https://cdn.example.com/${filename}`,
	mime_type: "image/jpeg",
	file_size: 1024,
	alt_text: null,
	width: 100,
	height: 100,
	created_at: "2026-01-01T00:00:00Z",
	variants: [],
})

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => { server.resetHandlers(); resetNavigationMocks() })
afterAll(() => server.close())

describe("post attachments", () => {
	it("attaches every file ticked in the library at once, keeping those already attached", async () => {
		server.use(
			http.get(`${API}/media`, () =>
				HttpResponse.json(wrap(paginated([file("a", "a.jpg"), file("b", "b.jpg"), file("c", "c.jpg")]))),
			),
		)
		const onChange = vi.fn()
		const user = userEvent.setup()
		renderWithQueryClient(
			<AttachmentsInput value={[{ id: "a", url: "https://cdn.example.com/a.jpg", filename: "a.jpg" }]} onChange={onChange} />,
		)

		await user.click(screen.getByRole("button", { name: /من مكتبة الوسائط/ }))
		for (const name of ["c.jpg", "a.jpg", "b.jpg"]) {
			const tiles = await screen.findAllByRole("img", { name })
			// The last match is the picker's tile; the attached list shows a.jpg too.
			await user.click(tiles[tiles.length - 1])
		}
		await user.click(screen.getByRole("button", { name: "إضافة (3)" }))

		expect(onChange).toHaveBeenCalledTimes(1)
		expect(onChange.mock.calls[0][0].map((a: { id: string }) => a.id)).toEqual(["a", "c", "b"])
	})

	it("sends an image ticked for the gallery there as a draft", async () => {
		const created: unknown[] = []
		const translation = { lang: "ar", title: "خبر", summary: null, body: "<p>نص</p>", is_default: true }
		const post = {
			id: "p1",
			category_id: CATEGORY,
			cover_image_id: COVER,
			slug: "khabar",
			is_published: true,
			is_featured: false,
			published_at: "2026-01-01T00:00:00Z",
			post_attachments: [],
			post_translations: [translation],
			translation,
		} as unknown as Post
		server.use(
			http.get(`${API}/post-categories`, () => HttpResponse.json(wrap(paginated([])))),
			http.get(`${API}/languages`, () => HttpResponse.json(wrap([{ code: "ar", name: "Arabic", native_name: "العربية", is_active: true }]))),
			http.get(`${API}/media/${COVER}`, () => HttpResponse.json(wrap(file(COVER, "cover.jpg")))),
			http.patch(`${API}/posts/p1`, () => HttpResponse.json(wrap(post))),
			http.post(`${API}/gallery`, async ({ request }) => {
				created.push(await request.json())
				return HttpResponse.json(wrap({ media_id: COVER }), { status: 201 })
			}),
		)
		const user = userEvent.setup()
		renderWithQueryClient(<PostForm post={post} />)

		await user.click(await screen.findByRole("checkbox", { name: /إلى معرض الصور/ }))
		await user.click(screen.getByRole("button", { name: "تحديث الخبر" }))

		await waitFor(() => expect(created).toHaveLength(1))
		expect(created[0]).toMatchObject({ media_id: COVER, is_published: false })
	})
})
