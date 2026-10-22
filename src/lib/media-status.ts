import type { MediaRecord, MediaReference, VariantsStatus, VariantsStatusReason } from "@/types"

/**
 * Editor-facing wording for a media row's variants state. The label is short
 * enough for a tile badge; `detail` is the longer explanation for the editor
 * dialog. `tone` maps to the Badge palette. `canRegenerate` is true ONLY for
 * `partial` — regenerating can't help `unavailable` or `not_applicable`.
 */
export type VariantsPresentation = {
	status: VariantsStatus
	label: string
	detail: string
	tone: "success" | "info" | "warning" | "default"
	canRegenerate: boolean
}

const REASON_DETAIL: Partial<Record<VariantsStatusReason, string>> = {
	TOO_SMALL: "الصورة صغيرة (320 بكسل عرضاً أو أقل) فلا حاجة لنسخ أصغر منها — يُعرض الأصل نفسه.",
	UNREADABLE: "تعذّرت قراءة الصورة لتوليد نسخ منها — يُعرض الأصل نفسه. جرّب رفعها من جديد بصيغة JPEG أو PNG.",
	ORIGINAL_MISSING: "الملف الأصلي غير موجود في التخزين، فلا يمكن توليد نسخ منه.",
	ANIMATED: "صورة متحركة (GIF) — لا تُولَّد لها نسخ ويُعرض الأصل نفسه.",
	NON_RASTER: "هذا النوع من الملفات لا تُولَّد له نسخ ويُعرض الأصل نفسه.",
}

export function describeVariants(m: Pick<MediaRecord, "mime_type" | "variants" | "variants_status" | "variants_status_reason">): VariantsPresentation | null {
	if (!m.mime_type?.startsWith("image/")) return null
	// Older payloads (and PATCH's bare row) carry no status — say nothing
	// rather than guess from variants.length, which is exactly what's wrong.
	if (!m.variants_status) return null
	switch (m.variants_status) {
		case "ready":
			return { status: "ready", label: `${m.variants.length} نسخ`, detail: "جاهزة للعرض على الموقع.", tone: "success", canRegenerate: false }
		case "processing":
			return { status: "processing", label: "جارٍ التوليد", detail: "تُولَّد النسخ الآن، وتظهر عادةً خلال ثوانٍ.", tone: "info", canRegenerate: false }
		case "partial":
			return {
				status: "partial",
				label: "نسخ ناقصة",
				detail: "لم تكتمل النسخ بعد مرور دقيقتين — فشل التوليد. اضغط «إعادة توليد» للمحاولة من جديد.",
				tone: "warning",
				canRegenerate: true,
			}
		case "unavailable":
			return {
				status: "unavailable",
				label: "الأصل فقط",
				detail: (m.variants_status_reason && REASON_DETAIL[m.variants_status_reason]) || "لا يمكن توليد نسخ لهذه الصورة — يُعرض الأصل نفسه.",
				tone: "default",
				canRegenerate: false,
			}
		case "not_applicable":
			return {
				status: "not_applicable",
				label: "الأصل فقط",
				detail: (m.variants_status_reason && REASON_DETAIL[m.variants_status_reason]) || "لا تُولَّد نسخ لهذا الملف — يُعرض الأصل نفسه.",
				tone: "default",
				canRegenerate: false,
			}
	}
}

const REFERENCE_TYPE_LABEL: Record<MediaReference["type"], string> = {
	post: "مقال",
	book: "كتاب",
	static_page: "صفحة ثابتة",
	gallery_image: "صورة في المعرض",
}

const REFERENCE_FIELD_LABEL: Record<string, string> = {
	cover_image: "صورة الغلاف",
	og_image: "صورة المشاركة (SEO)",
	attachment: "مرفق",
	gallery_item: "هي نفسها عنصر في المعرض",
}

/** "مقال — صورة المشاركة (SEO) · ar" — never an id. */
export function describeReference(r: MediaReference): string {
	const type = REFERENCE_TYPE_LABEL[r.type] ?? r.type
	const field = REFERENCE_FIELD_LABEL[r.field] ?? r.field
	return `${type} — ${field}${r.lang ? ` · ${r.lang}` : ""}`
}
