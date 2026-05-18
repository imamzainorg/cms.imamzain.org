import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import ConfirmDialog, { useConfirm } from "@/components/ui/ConfirmDialog"

describe("ConfirmDialog component", () => {
	it("does not render when open is false", () => {
		render(
			<ConfirmDialog
				open={false}
				title="Delete this?"
				onConfirm={() => {}}
				onCancel={() => {}}
			/>,
		)
		expect(screen.queryByText("Delete this?")).toBeNull()
	})

	it("renders title and description when open", () => {
		render(
			<ConfirmDialog
				open
				title="Delete this?"
				description="This cannot be undone."
				onConfirm={() => {}}
				onCancel={() => {}}
			/>,
		)
		expect(screen.getByText("Delete this?")).toBeInTheDocument()
		expect(screen.getByText("This cannot be undone.")).toBeInTheDocument()
	})

	it("uses Arabic defaults for confirm/cancel labels", () => {
		render(
			<ConfirmDialog open title="x" onConfirm={() => {}} onCancel={() => {}} />,
		)
		expect(screen.getByText("تأكيد")).toBeInTheDocument()
		expect(screen.getByText("إلغاء")).toBeInTheDocument()
	})

	it("calls onConfirm when the confirm button is clicked", () => {
		const onConfirm = vi.fn()
		render(
			<ConfirmDialog open title="x" onConfirm={onConfirm} onCancel={() => {}} confirmText="حذف" />,
		)
		fireEvent.click(screen.getByText("حذف"))
		expect(onConfirm).toHaveBeenCalledOnce()
	})

	it("calls onCancel when the cancel button is clicked", () => {
		const onCancel = vi.fn()
		render(
			<ConfirmDialog open title="x" onConfirm={() => {}} onCancel={onCancel} />,
		)
		fireEvent.click(screen.getByText("إلغاء"))
		expect(onCancel).toHaveBeenCalledOnce()
	})

	it("disables both buttons while loading", () => {
		render(
			<ConfirmDialog open title="x" onConfirm={() => {}} onCancel={() => {}} loading />,
		)
		const cancel = screen.getByText("إلغاء").closest("button")!
		expect(cancel).toBeDisabled()
	})
})

describe("useConfirm imperative hook", () => {
	function TestHarness({ onAnswer }: { onAnswer: (v: boolean) => void }) {
		const { confirm, dialog } = useConfirm()
		return (
			<div>
				<button
					onClick={async () => {
						const ok = await confirm({ title: "حذف؟", confirmText: "حذف", tone: "danger" })
						onAnswer(ok)
					}}
				>
					trigger
				</button>
				{dialog}
			</div>
		)
	}

	it("resolves to true when the user clicks confirm", async () => {
		const answer = vi.fn()
		render(<TestHarness onAnswer={answer} />)
		await act(async () => {
			fireEvent.click(screen.getByText("trigger"))
		})
		expect(screen.getByText("حذف؟")).toBeInTheDocument()
		await act(async () => {
			fireEvent.click(screen.getByText("حذف"))
		})
		expect(answer).toHaveBeenCalledWith(true)
	})

	it("resolves to false when the user clicks cancel", async () => {
		const answer = vi.fn()
		render(<TestHarness onAnswer={answer} />)
		await act(async () => { fireEvent.click(screen.getByText("trigger")) })
		await act(async () => { fireEvent.click(screen.getByText("إلغاء")) })
		expect(answer).toHaveBeenCalledWith(false)
	})

	it("hides the dialog after resolution", async () => {
		const answer = vi.fn()
		render(<TestHarness onAnswer={answer} />)
		await act(async () => { fireEvent.click(screen.getByText("trigger")) })
		await act(async () => { fireEvent.click(screen.getByText("إلغاء")) })
		expect(screen.queryByText("حذف؟")).toBeNull()
	})
})
