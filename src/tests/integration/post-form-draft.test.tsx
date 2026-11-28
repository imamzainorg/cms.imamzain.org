import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from "vitest"
import userEvent from "@testing-library/user-event"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { screen, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { navigationMock, resetNavigationMocks } from "../mocks/next-navigation"

vi.mock("next/navigation", () => navigationMock)

import PostForm from "@/components/posts/PostForm"
import { renderWithQueryClient, wrap, paginated } from "../utils"

const API = "http://localhost:3000/api/v1"
const CATEGORY = "11111111-1111-4111-8111-111111111111"
const KEY = "cms:draft:anonymous:post"

const server = setupServer(
	http.get(`${API}/post-categories`, () => HttpResponse.json(wrap(paginated([])))),
	http.get(`${API}/languages`, () => HttpResponse.json(wrap([{ code: "ar", name: "Arabic", native_name: "العربية", is_active: true }]))),
)
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
beforeEach(() => localStorage.clear())
afterEach(() => { server.resetHandlers(); resetNavigationMocks(); vi.restoreAllMocks() })
afterAll(() => server.close())

const titleInput = async () =>
	await waitFor(() => {
		const input = document.querySelector<HTMLInputElement>('input[name="translations.0.title"]')
		expect(input).not.toBeNull()
		return input!
	})

describe("new post form", () => {
	it("keeps what was typed when the editor leaves, and brings it back", async () => {
		const user = userEvent.setup()
		const first = renderWithQueryClient(<PostForm />)
		await user.type(await titleInput(), "خبر لم يكتمل")
		// Leaving at once: the last keystrokes are still inside the save delay.
		first.unmount()

		renderWithQueryClient(<PostForm />)

		await waitFor(async () => expect(await titleInput()).toHaveValue("خبر لم يكتمل"))
		expect(screen.getByRole("button", { name: "حذف المسودة والبدء من جديد" })).toBeInTheDocument()
	})

	it("sends a restored post and then forgets the copy", async () => {
		localStorage.setItem(KEY, JSON.stringify({
			savedAt: "2026-11-28T10:00:00Z",
			values: {
				category_id: CATEGORY,
				slug: "khabar",
				is_published: true,
				translations: [{ lang: "ar", title: "خبر", summary: "", body: "<p>نص</p>", is_default: true }],
			},
		}))
		const sent: unknown[] = []
		server.use(
			http.post(`${API}/posts`, async ({ request }) => {
				sent.push(await request.json())
				return HttpResponse.json(wrap({ id: "p1" }), { status: 201 })
			}),
		)
		const user = userEvent.setup()
		const view = renderWithQueryClient(<PostForm />)
		await waitFor(async () => expect(await titleInput()).toHaveValue("خبر"))

		await user.click(screen.getByRole("button", { name: "إنشاء خبر" }))

		await waitFor(() => expect(localStorage.getItem(KEY)).toBeNull())
		expect(sent[0]).toMatchObject({ category_id: CATEGORY, slug: "khabar", is_published: true })
		view.unmount()
		expect(localStorage.getItem(KEY)).toBeNull()
	})

	it("says what is missing instead of doing nothing", async () => {
		const error = vi.spyOn(toast, "error")
		const user = userEvent.setup()
		renderWithQueryClient(<PostForm />)
		await titleInput()

		await user.click(screen.getByRole("button", { name: "إنشاء خبر" }))

		await waitFor(() => expect(error).toHaveBeenCalled())
		const description = (error.mock.calls[0][1] as { description: string }).description
		expect(description).toContain("التصنيف مطلوب")
		expect(description).toContain("المحتوى مطلوب")
	})
})
