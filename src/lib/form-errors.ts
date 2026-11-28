import type { FieldErrors, FieldValues } from "react-hook-form"
import { toast } from "sonner"
import { languageLabel } from "@/lib/useLanguages"

const LABELS: Record<string, string> = {
	category_id: "التصنيف",
	cover_image_id: "صورة الغلاف",
	slug: "الرابط المختصر",
	title: "العنوان",
	body: "المحتوى",
	summary: "الملخص",
	description: "الوصف",
	abstract: "الملخص",
	meta_title: "عنوان SEO",
	meta_description: "وصف SEO",
	published_at: "تاريخ النشر",
	publish_year: "سنة النشر",
	published_year: "سنة النشر",
	pages: "عدد الصفحات",
	pdf_url: "ملف PDF",
	audio_url: "الملف الصوتي",
	speaker_id: "المتحدث",
	display_order: "ترتيب العرض",
}

type Problem = { path: string[]; message: string }

function collect(node: unknown, path: string[], found: Problem[]) {
	if (!node || typeof node !== "object") return
	const { message } = node as { message?: unknown }
	if (typeof message === "string" && message) {
		found.push({ path, message })
		return
	}
	// `ref` is the DOM element itself.
	for (const [key, child] of Object.entries(node)) if (key !== "ref") collect(child, [...path, key], found)
}

/**
 * A form that fails validation sends nothing, and its field errors are often off screen or on another
 * language tab. Says what is missing, and returns the language of the first translation at fault.
 */
export function reportInvalid<T extends FieldValues>(
	errors: FieldErrors<T>,
	translations: { lang: string }[] = [],
): string | undefined {
	const found: Problem[] = []
	collect(errors, [], found)
	const langOf = (path: string[]) => (path[0] === "translations" ? translations[Number(path[1])]?.lang : undefined)
	const lines = found.map(({ path, message }) => {
		const field = [...path].reverse().find((p) => Number.isNaN(Number(p)) && p !== "root") ?? ""
		// Messages without any Arabic are the validation library's own defaults.
		const text = /[؀-ۿ]/.test(message) ? message : `${LABELS[field] ?? field}: قيمة غير صالحة`
		const lang = langOf(path)
		return lang && translations.length > 1 ? `${text} (${languageLabel(lang)})` : text
	})
	toast.error("لم يُحفظ بعد. أكمل ما يلي:", {
		description: [...new Set(lines)].join("، "),
		duration: 8000,
	})
	return found.map((p) => langOf(p.path)).find(Boolean)
}
