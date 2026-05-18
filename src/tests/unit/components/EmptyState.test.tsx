import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import EmptyState from "@/components/ui/EmptyState"
import { BookOpen } from "lucide-react"

describe("EmptyState", () => {
	it("renders the title", () => {
		render(<EmptyState title="Nothing here" />)
		expect(screen.getByText("Nothing here")).toBeInTheDocument()
	})

	it("renders the description when provided", () => {
		render(<EmptyState title="Empty" description="No data has been added yet." />)
		expect(screen.getByText("No data has been added yet.")).toBeInTheDocument()
	})

	it("renders the action slot", () => {
		render(<EmptyState title="x" action={<button>Add new</button>} />)
		expect(screen.getByText("Add new")).toBeInTheDocument()
	})

	it("variant='card' wraps content in a white card", () => {
		const { container } = render(<EmptyState title="x" variant="card" />)
		const card = container.querySelector(".bg-white")
		expect(card).not.toBeNull()
	})

	it("variant='bare' renders without the card wrapper", () => {
		const { container } = render(<EmptyState title="x" variant="bare" />)
		const card = container.querySelector(".bg-white")
		expect(card).toBeNull()
	})

	it("renders a custom icon when provided", () => {
		const { container } = render(<EmptyState title="x" icon={BookOpen} />)
		// lucide-react renders an SVG; check it exists
		expect(container.querySelector("svg")).not.toBeNull()
	})
})
