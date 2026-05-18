import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import PageHeader from "@/components/layout/PageHeader"
import { FileText } from "lucide-react"

describe("PageHeader", () => {
	it("renders title", () => {
		render(<PageHeader title="المقالات" />)
		expect(screen.getByText("المقالات")).toBeInTheDocument()
	})

	it("renders description when given", () => {
		render(<PageHeader title="x" description="Manage your content here" />)
		expect(screen.getByText("Manage your content here")).toBeInTheDocument()
	})

	it("renders actions slot on the right", () => {
		render(<PageHeader title="x" actions={<button>Create</button>} />)
		expect(screen.getByText("Create")).toBeInTheDocument()
	})

	it("renders breadcrumbs with links", () => {
		render(
			<PageHeader
				title="Detail"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard" },
					{ label: "Posts", href: "/dashboard/posts" },
					{ label: "Current" },
				]}
			/>,
		)
		expect(screen.getByText("Dashboard").closest("a")).toHaveAttribute("href", "/dashboard")
		expect(screen.getByText("Posts").closest("a")).toHaveAttribute("href", "/dashboard/posts")
		// Last crumb has no href
		expect(screen.getByText("Current").closest("a")).toBeNull()
	})

	it("renders the icon when provided", () => {
		const { container } = render(<PageHeader title="x" icon={FileText} />)
		expect(container.querySelector("svg")).not.toBeNull()
	})

	it("renders stats below the header when provided", () => {
		render(<PageHeader title="x" stats={<span>123 items</span>} />)
		expect(screen.getByText("123 items")).toBeInTheDocument()
	})
})
