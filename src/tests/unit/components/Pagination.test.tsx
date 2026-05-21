import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import Pagination from "@/components/ui/Pagination"

describe("Pagination", () => {
	it("returns null when total is 0", () => {
		const { container } = render(
			<Pagination page={1} pages={1} total={0} limit={20} onPage={() => {}} />,
		)
		expect(container.innerHTML).toBe("")
	})

	it("renders the from–to range and total (Arabic-Indic numerals)", () => {
		render(
			<Pagination page={2} pages={5} total={100} limit={20} onPage={() => {}} />,
		)
		// fromIdx = 21 → ٢١, toIdx = 40 → ٤٠ — converted to Arabic-Indic digits
		// per the design system. The text node renders as "٢١–٤٠" inside the span.
		expect(screen.getByText("٢١–٤٠")).toBeInTheDocument()
	})

	it("calls onPage with page - 1 when Previous is clicked", () => {
		const onPage = vi.fn()
		render(
			<Pagination page={3} pages={5} total={100} limit={20} onPage={onPage} />,
		)
		fireEvent.click(screen.getByText("السابق"))
		expect(onPage).toHaveBeenCalledWith(2)
	})

	it("calls onPage with page + 1 when Next is clicked", () => {
		const onPage = vi.fn()
		render(
			<Pagination page={3} pages={5} total={100} limit={20} onPage={onPage} />,
		)
		fireEvent.click(screen.getByText("التالي"))
		expect(onPage).toHaveBeenCalledWith(4)
	})

	it("disables Previous on the first page", () => {
		render(
			<Pagination page={1} pages={5} total={100} limit={20} onPage={() => {}} />,
		)
		expect(screen.getByText("السابق").closest("button")).toBeDisabled()
	})

	it("disables Next on the last page", () => {
		render(
			<Pagination page={5} pages={5} total={100} limit={20} onPage={() => {}} />,
		)
		expect(screen.getByText("التالي").closest("button")).toBeDisabled()
	})

	it("renders the page-size selector when onLimit is supplied", () => {
		const onLimit = vi.fn()
		const { container } = render(
			<Pagination
				page={1}
				pages={1}
				total={50}
				limit={20}
				pageSizes={[20, 50, 100]}
				onPage={() => {}}
				onLimit={onLimit}
			/>,
		)
		const select = container.querySelector("select") as HTMLSelectElement
		expect(select).not.toBeNull()
		fireEvent.change(select, { target: { value: "100" } })
		expect(onLimit).toHaveBeenCalledWith(100)
	})

	it("does NOT render the page-size selector when onLimit is omitted", () => {
		const { container } = render(
			<Pagination page={1} pages={1} total={50} limit={20} onPage={() => {}} />,
		)
		expect(container.querySelector("select")).toBeNull()
	})
})
