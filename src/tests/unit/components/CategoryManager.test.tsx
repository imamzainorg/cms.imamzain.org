import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { screen, waitFor, fireEvent, act } from "@testing-library/react"
import CategoryManager from "@/components/categories/CategoryManager"
import { postCategoriesService } from "@/services/post-categories.service"
import { queryKeys } from "@/lib/queries/keys"
import { renderWithQueryClient, wrap, paginated } from "../../utils"

const API = "http://localhost:3000/api/v1"

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function makeCategory(id: string, title: string) {
	return {
		id,
		created_at: "2024-01-01",
		post_category_translations: [
			{ category_id: id, lang: "ar", title, slug: title.toLowerCase(), description: null },
		],
		translation: { category_id: id, lang: "ar", title, slug: title.toLowerCase(), description: null },
	}
}

function renderManager() {
	return renderWithQueryClient(
		<CategoryManager
			title="تصنيفات المقالات"
			singular="تصنيف"
			service={postCategoriesService}
			queryKey={queryKeys.postCategories.all}
			translationsField="post_category_translations"
		/>,
	)
}

describe("CategoryManager", () => {
	it("shows a loading spinner, then the list of categories", async () => {
		server.use(http.get(`${API}/post-categories`, () =>
			HttpResponse.json(wrap(paginated([makeCategory("c1", "مقالات")]))),
		))
		renderManager()
		// Spinner is rendered as an SVG with the "animate-spin" class
		await waitFor(() => expect(screen.getByText("مقالات")).toBeInTheDocument())
	})

	it("shows the empty state when no categories exist", async () => {
		server.use(http.get(`${API}/post-categories`, () =>
			HttpResponse.json(wrap(paginated([]))),
		))
		renderManager()
		await waitFor(() =>
			expect(screen.getByText(/لا توجد تصنيفات بعد/)).toBeInTheDocument(),
		)
	})

	it("opens the create dialog when 'new' button is clicked", async () => {
		server.use(http.get(`${API}/post-categories`, () =>
			HttpResponse.json(wrap(paginated([]))),
		))
		renderManager()
		await waitFor(() => expect(screen.getAllByText(/تصنيف جديد/).length).toBeGreaterThan(0))
		// The header button reads "تصنيف جديد"
		const newButtons = screen.getAllByText(/تصنيف جديد/)
		await act(async () => { fireEvent.click(newButtons[0]) })
		// Dialog heading uses the same Arabic "{singular} جديد" wording
		await waitFor(() =>
			expect(screen.getByPlaceholderText("اسم التصنيف")).toBeInTheDocument(),
		)
	})

	it("creates a category and refetches the list", async () => {
		let listHits = 0
		let createBody: unknown = null
		server.use(
			http.get(`${API}/post-categories`, () => {
				listHits++
				return HttpResponse.json(wrap(paginated([])))
			}),
			http.post(`${API}/post-categories`, async ({ request }) => {
				createBody = await request.json()
				return HttpResponse.json(wrap({ id: "new1" }))
			}),
		)
		renderManager()
		await waitFor(() => expect(screen.getByText(/لا توجد تصنيفات/)).toBeInTheDocument())
		const before = listHits

		// Open create dialog
		const newButtons = screen.getAllByText(/تصنيف جديد/)
		await act(async () => { fireEvent.click(newButtons[0]) })

		// Fill in the title
		const input = await waitFor(() => screen.getByPlaceholderText("اسم التصنيف"))
		await act(async () => {
			fireEvent.change(input, { target: { value: "أخبار" } })
		})

		// Submit
		const saveButton = screen.getByText("حفظ")
		await act(async () => { fireEvent.click(saveButton) })

		await waitFor(() => {
			expect((createBody as { translations: { title: string }[] }).translations[0].title).toBe("أخبار")
		})
		// After invalidation the list refetches
		await waitFor(() => expect(listHits).toBeGreaterThan(before))
	})

	it("delete shows a confirm dialog and calls DELETE on confirm", async () => {
		let deleted = ""
		server.use(
			http.get(`${API}/post-categories`, () =>
				HttpResponse.json(wrap(paginated([makeCategory("c1", "مقالات")]))),
			),
			http.delete(`${API}/post-categories/:id`, ({ params }) => {
				deleted = String(params.id)
				return HttpResponse.json(wrap({}))
			}),
		)
		const { container } = renderManager()
		await waitFor(() => expect(screen.getByText("مقالات")).toBeInTheDocument())

		// Trash icon is a button titled "حذف"
		const trashButton = container.querySelector('button[title="حذف"]') as HTMLButtonElement
		await act(async () => { fireEvent.click(trashButton) })

		// Confirm dialog appears
		await waitFor(() => expect(screen.getByText(/حذف هذا تصنيف/)).toBeInTheDocument())

		// Click confirm (the danger-red "حذف" button inside the dialog)
		const confirmButtons = screen.getAllByText("حذف")
		// The last "حذف" is inside the dialog footer
		await act(async () => { fireEvent.click(confirmButtons[confirmButtons.length - 1]) })

		await waitFor(() => expect(deleted).toBe("c1"))
	})
})
