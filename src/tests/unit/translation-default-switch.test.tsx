import { describe, it, expect } from "vitest"
import { render, fireEvent, waitFor } from "@testing-library/react"
import { useForm, useFieldArray } from "react-hook-form"

/**
 * Regression guard for the "default language" checkbox idiom shared by every
 * react-hook-form content editor (Book / Paper / Post / StaticPage / Audio).
 *
 * The trap: spreading `{...register(field)}` and then declaring `onChange`
 * AFTER the spread OVERRIDES react-hook-form's own onChange, so the CLICKED
 * checkbox's value never reaches form state. A handler that only clears the
 * OTHER checkboxes then leaves ZERO defaults on submit, and the editor can
 * never switch the default language (submit fails the exactly-one-default
 * check). The correct handler sets every index explicitly via setValue.
 */
type FormData = { translations: { lang: string; is_default: boolean }[] }

function DefaultSwitcher({ onData }: { onData: (d: FormData) => void }) {
	const { register, handleSubmit, control, setValue } = useForm<FormData>({
		defaultValues: {
			translations: [
				{ lang: "ar", is_default: true },
				{ lang: "en", is_default: false },
			],
		},
	})
	const { fields } = useFieldArray({ control, name: "translations" })
	return (
		<form onSubmit={handleSubmit(onData)}>
			{fields.map((f, index) => (
				<input
					key={f.id}
					type="checkbox"
					data-testid={`cb-${index}`}
					{...register(`translations.${index}.is_default`)}
					onChange={(e) => {
						// The fix: drive ALL indices through setValue so the clicked
						// checkbox's value lands in form state too.
						if (e.target.checked) {
							fields.forEach((_, i) => setValue(`translations.${i}.is_default`, i === index))
						} else {
							setValue(`translations.${index}.is_default`, false)
						}
					}}
				/>
			))}
			<button type="submit">go</button>
		</form>
	)
}

describe("translation default-language switch", () => {
	it("switching the default to another language yields exactly one default at submit", async () => {
		let data: FormData | undefined
		const { getByTestId, getByText } = render(<DefaultSwitcher onData={(d) => (data = d)} />)
		fireEvent.click(getByTestId("cb-1")) // editor makes EN the default
		fireEvent.click(getByText("go"))
		await waitFor(() => expect(data).toBeDefined())
		expect(data!.translations.filter((t) => t.is_default).length).toBe(1)
		expect(data!.translations[0].is_default).toBe(false)
		expect(data!.translations[1].is_default).toBe(true)
	})
})
