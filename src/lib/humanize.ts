/**
 * Localized human labels for technical values that surface in the UI.
 * Goal: never show raw IDs, MIME strings, or codes to non-technical editors.
 */

const MIME_LABELS: Record<string, string> = {
	"application/pdf": "ملف PDF",
	"application/msword": "ملف Word",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": "ملف Word",
	"application/vnd.ms-excel": "جدول Excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "جدول Excel",
	"application/vnd.ms-powerpoint": "عرض PowerPoint",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": "عرض PowerPoint",
	"application/zip": "ملف مضغوط",
	"application/x-rar-compressed": "ملف مضغوط",
	"application/x-7z-compressed": "ملف مضغوط",
	"text/plain": "ملف نصي",
	"text/csv": "ملف CSV",
	"application/json": "ملف JSON",
	"audio/mpeg": "ملف صوتي",
	"audio/wav": "ملف صوتي",
	"audio/ogg": "ملف صوتي",
	"video/mp4": "فيديو",
	"video/quicktime": "فيديو",
	"video/webm": "فيديو",
}

const MIME_PREFIX_LABELS: { prefix: string; label: string }[] = [
	{ prefix: "image/", label: "صورة" },
	{ prefix: "video/", label: "فيديو" },
	{ prefix: "audio/", label: "ملف صوتي" },
	{ prefix: "text/", label: "ملف نصي" },
]

export function humanizeMime(mime: string | null | undefined): string {
	if (!mime) return "ملف"
	const exact = MIME_LABELS[mime.toLowerCase()]
	if (exact) return exact
	for (const { prefix, label } of MIME_PREFIX_LABELS) {
		if (mime.toLowerCase().startsWith(prefix)) return label
	}
	const sub = mime.split("/")[1]
	if (sub) return sub.toUpperCase()
	return "ملف"
}

export function humanizeFileSize(bytes: number | null | undefined): string {
	if (bytes == null || bytes < 0 || !Number.isFinite(bytes)) return "—"
	if (bytes < 1024) return `${bytes} بايت`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ج.ب`
}

const RESOURCE_LABELS: Record<string, string> = {
	post: "مقالة",
	posts: "مقالة",
	book: "كتاب",
	books: "كتاب",
	"academic-paper": "بحث",
	"academic_paper": "بحث",
	"academic-papers": "بحث",
	paper: "بحث",
	papers: "بحث",
	gallery: "معرض",
	"gallery-image": "صورة معرض",
	"gallery_image": "صورة معرض",
	media: "ملف وسائط",
	user: "مستخدم",
	users: "مستخدم",
	role: "دور",
	roles: "دور",
	permission: "صلاحية",
	permissions: "صلاحية",
	contact: "رسالة تواصل",
	contacts: "رسالة تواصل",
	"contact-message": "رسالة تواصل",
	newsletter: "اشتراك نشرة",
	"newsletter-subscriber": "مشترك نشرة",
	contest: "مسابقة",
	"contest-participant": "مشارك مسابقة",
	"proxy-visit": "طلب زيارة",
	"post-category": "تصنيف مقالة",
	"book-category": "تصنيف كتاب",
	"paper-category": "تصنيف بحث",
	"academic-paper-category": "تصنيف بحث",
	"gallery-category": "تصنيف معرض",
	category: "تصنيف",
	language: "لغة",
	languages: "لغة",
	auth: "مصادقة",
	session: "جلسة",
	setting: "إعداد",
	settings: "إعداد",
}

export function humanizeResource(resource: string | null | undefined): string {
	if (!resource) return "عنصر"
	const key = resource.toLowerCase().replace(/_/g, "-")
	return RESOURCE_LABELS[key] ?? RESOURCE_LABELS[key.replace(/s$/, "")] ?? resource
}

const ACTION_VERBS: Record<string, string> = {
	create: "أنشأ",
	created: "أنشأ",
	update: "حدّث",
	updated: "حدّث",
	delete: "حذف",
	deleted: "حذف",
	remove: "حذف",
	removed: "حذف",
	publish: "نشر",
	published: "نشر",
	unpublish: "ألغى النشر",
	unpublished: "ألغى النشر",
	login: "سجّل الدخول",
	logout: "سجّل الخروج",
	upload: "رفع",
	uploaded: "رفع",
	download: "نزّل",
	downloaded: "نزّل",
	read: "قرأ",
	view: "عرض",
	viewed: "عرض",
	assign: "عيّن",
	assigned: "عيّن",
	unassign: "ألغى تعيين",
	unassigned: "ألغى تعيين",
	approve: "وافق على",
	approved: "وافق على",
	reject: "رفض",
	rejected: "رفض",
	subscribe: "اشترك",
	subscribed: "اشترك",
	unsubscribe: "ألغى اشتراك",
	unsubscribed: "ألغى اشتراك",
	reply: "ردّ على",
	replied: "ردّ على",
	send: "أرسل",
	sent: "أرسل",
	import: "استورد",
	export: "صدّر",
}

/**
 * Convert audit-log codes like "POST_CREATED" / "post.create" / "user-update"
 * into a localized phrase like { verb: "أنشأ", resource: "مقالة" }.
 * Returns the original code as `raw` for fallback display.
 */
export function humanizeAuditAction(code: string | null | undefined): {
	verb: string
	resource: string
	label: string
} {
	if (!code) return { verb: "", resource: "", label: "—" }
	const normalized = code.toLowerCase().replace(/[._]/g, "-")
	const parts = normalized.split("-").filter(Boolean)
	if (parts.length === 0) return { verb: "", resource: "", label: code }

	let verb = ""
	let resource = ""

	for (const p of parts) {
		if (!verb && ACTION_VERBS[p]) verb = ACTION_VERBS[p]
		else if (!resource && (RESOURCE_LABELS[p] || RESOURCE_LABELS[p.replace(/s$/, "")])) {
			resource = humanizeResource(p)
		}
	}
	if (!resource && parts.length > 1) {
		const guess = parts.filter((p) => !ACTION_VERBS[p]).join("-")
		resource = humanizeResource(guess) || guess
	}
	if (!verb && parts.length > 0) {
		verb = ACTION_VERBS[parts[parts.length - 1]] ?? parts[parts.length - 1]
	}

	const label = [verb, resource].filter(Boolean).join(" ") || code
	return { verb, resource, label }
}
