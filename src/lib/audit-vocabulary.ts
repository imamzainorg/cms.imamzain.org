import type { AuditLog } from "@/types"

/**
 * The audit-log vocabulary the API actually writes (see the API repo's
 * docs/permissions.md → "Audit action vocabulary" and
 * worker/src/lib/audit-actions.ts).
 *
 * `GET /audit-logs?action=` and `?resource_type=` are EXACT matches, so a
 * filter has to send the stored literal (`POST_CREATED`, `academic_paper`),
 * not a loose word like "CREATE". Everything the filter UI offers comes from
 * the tables below — keep them in step with the API when it adds actions.
 */

export type AuditOption = { value: string; label: string }
export type AuditOptionGroup = { label: string; options: AuditOption[] }

/** `audit_logs.resource_type` values, with the Arabic noun used in the feed. */
export const AUDIT_RESOURCE_OPTIONS: AuditOption[] = [
	{ value: "post", label: "أخبار" },
	{ value: "book", label: "كتب" },
	{ value: "academic_paper", label: "أبحاث" },
	{ value: "gallery_image", label: "صور المعرض" },
	{ value: "audio", label: "تسجيلات صوتية" },
	{ value: "speaker", label: "متحدثون" },
	{ value: "static_page", label: "صفحات ثابتة" },
	{ value: "store", label: "منافذ البيع (المدن)" },
	{ value: "store_location", label: "منافذ البيع (المواقع)" },
	{ value: "daily_hadith", label: "أحاديث يومية" },
	{ value: "post_category", label: "تصنيفات الأخبار" },
	{ value: "book_category", label: "تصنيفات الكتب" },
	{ value: "academic_paper_category", label: "تصنيفات الأبحاث" },
	{ value: "gallery_category", label: "تصنيفات المعرض" },
	{ value: "media", label: "وسائط" },
	{ value: "user", label: "مستخدمون" },
	{ value: "role", label: "أدوار" },
	{ value: "language", label: "لغات" },
	{ value: "site_setting", label: "إعدادات الموقع" },
	{ value: "contact_submission", label: "رسائل التواصل" },
	{ value: "proxy_visit_request", label: "طلبات الزيارة" },
	{ value: "newsletter_subscriber", label: "مشتركو النشرة" },
]

const VERB_LABEL: Record<string, string> = {
	CREATED: "إنشاء",
	UPDATED: "تعديل",
	DELETED: "حذف",
	RESTORED: "استعادة",
	PUBLISHED: "نشر",
	UNPUBLISHED: "إلغاء النشر",
}

const CRUD = ["CREATED", "UPDATED", "DELETED", "RESTORED"]
const CRUD_PUBLISH = [...CRUD, "PUBLISHED", "UNPUBLISHED"]

/** Resources that follow the PREFIX_VERB pattern: [stored prefix, group label, verbs]. */
const PATTERNED: Array<[string, string, string[]]> = [
	["POST", "الأخبار", CRUD_PUBLISH],
	["BOOK", "الكتب", CRUD_PUBLISH],
	["ACADEMIC_PAPER", "الأبحاث", CRUD_PUBLISH],
	["GALLERY_IMAGE", "صور المعرض", CRUD_PUBLISH],
	["AUDIO", "التسجيلات الصوتية", CRUD_PUBLISH],
	["STATIC_PAGE", "الصفحات الثابتة", CRUD_PUBLISH],
	["DAILY_HADITH", "الأحاديث اليومية", CRUD],
	["SPEAKER", "المتحدثون", CRUD],
	["STORE", "منافذ البيع", CRUD],
	["POST_CATEGORY", "تصنيفات الأخبار", CRUD],
	["BOOK_CATEGORY", "تصنيفات الكتب", CRUD],
	["ACADEMIC_PAPER_CATEGORY", "تصنيفات الأبحاث", CRUD],
	["GALLERY_CATEGORY", "تصنيفات المعرض", CRUD],
	["USER", "المستخدمون", CRUD],
	["ROLE", "الأدوار", ["CREATED", "UPDATED", "DELETED"]],
	["CONTACT", "رسائل التواصل", ["UPDATED", "DELETED", "RESTORED"]],
	["PROXY_VISIT", "طلبات الزيارة", ["UPDATED", "DELETED", "RESTORED"]],
]

/** Actions that don't fit PREFIX_VERB, with the sentence the feed shows. */
const SPECIAL_LABEL: Record<string, string> = {
	USER_LOGIN: "تسجيل دخول",
	USER_LOGIN_FAILED: "محاولة دخول فاشلة",
	USER_LOGOUT: "تسجيل خروج",
	USER_LOGOUT_ALL: "تسجيل خروج من كل الجلسات",
	REFRESH_TOKEN_REUSE_DETECTED: "إعادة استخدام رمز جلسة قديم (قد يدل على سرقة جلسة)",
	PASSWORD_CHANGED: "تغيير كلمة المرور",
	USER_PASSWORD_RESET_BY_ADMIN: "تعيين كلمة مرور جديدة لمستخدم",
	ROLE_ASSIGNED_TO_USER: "إسناد دور إلى مستخدم",
	ROLE_REMOVED_FROM_USER: "سحب دور من مستخدم",
	PERMISSION_ASSIGNED_TO_ROLE: "منح صلاحية لدور",
	PERMISSION_REMOVED_FROM_ROLE: "سحب صلاحية من دور",
	HIJRI_DATE_SET: "ضبط التاريخ الهجري يدوياً",
	MEDIA_CREATED: "رفع ملف وسائط",
	MEDIA_UPDATED: "تعديل ملف وسائط",
	MEDIA_DELETED: "حذف ملف وسائط",
	MEDIA_VARIANTS_REGENERATED: "إعادة توليد نسخ صورة",
	SETTING_CREATED: "إضافة إعداد",
	SETTING_UPDATED: "تعديل إعداد",
	SETTING_DELETED: "حذف إعداد",
	LANGUAGE_CREATED: "إضافة لغة",
	LANGUAGE_UPDATED: "تعديل لغة",
	LANGUAGE_DELETED: "حذف لغة",
	STORE_LOCATION_CREATED: "إضافة منفذ بيع",
	STORE_LOCATION_UPDATED: "تعديل منفذ بيع",
	STORE_LOCATION_DELETED: "حذف منفذ بيع",
	CONTACT_SUBMITTED: "رسالة تواصل جديدة من الموقع",
	PROXY_VISIT_SUBMITTED: "طلب زيارة جديد من الموقع",
	NEWSLETTER_SUBSCRIBE_REQUESTED: "طلب اشتراك في النشرة (بانتظار التأكيد)",
	NEWSLETTER_SUBSCRIBED: "تأكيد اشتراك في النشرة",
	NEWSLETTER_RESUBSCRIBED: "عودة مشترك إلى النشرة",
	NEWSLETTER_UNSUBSCRIBED: "إلغاء اشتراك من النشرة",
	NEWSLETTER_UNSUBSCRIBED_BY_ADMIN: "إلغاء اشتراك بواسطة مشرف",
	NEWSLETTER_RESUBSCRIBED_BY_ADMIN: "إعادة تفعيل مشترك بواسطة مشرف",
	NEWSLETTER_SUBSCRIBER_DELETED: "حذف مشترك",
	NEWSLETTER_SUBSCRIBER_RESTORED: "استعادة مشترك",
}

const LOGIN_FAILURE_REASON: Record<string, string> = {
	bad_password: "كلمة مرور خاطئة",
	unknown_username: "اسم مستخدم غير معروف",
	locked: "الحساب مقفل مؤقتاً",
}

/**
 * The options for the "الإجراء" filter: the exact stored literal as the value.
 * Auth/system actions first, then one optgroup per content type.
 */
export const AUDIT_ACTION_GROUPS: AuditOptionGroup[] = [
	{
		label: "الدخول والجلسات",
		options: [
			"USER_LOGIN",
			"USER_LOGIN_FAILED",
			"USER_LOGOUT",
			"USER_LOGOUT_ALL",
			"REFRESH_TOKEN_REUSE_DETECTED",
			"PASSWORD_CHANGED",
			"USER_PASSWORD_RESET_BY_ADMIN",
		].map((value) => ({ value, label: SPECIAL_LABEL[value] })),
	},
	{
		label: "الصلاحيات",
		options: [
			"ROLE_ASSIGNED_TO_USER",
			"ROLE_REMOVED_FROM_USER",
			"PERMISSION_ASSIGNED_TO_ROLE",
			"PERMISSION_REMOVED_FROM_ROLE",
		].map((value) => ({ value, label: SPECIAL_LABEL[value] })),
	},
	...PATTERNED.map(([prefix, label, verbs]): AuditOptionGroup => ({
		label,
		options: verbs.map((v) => ({ value: `${prefix}_${v}`, label: VERB_LABEL[v] })),
	})),
	{
		label: "النظام",
		options: ["HIJRI_DATE_SET", "MEDIA_CREATED", "MEDIA_UPDATED", "MEDIA_DELETED", "MEDIA_VARIANTS_REGENERATED", "SETTING_UPDATED", "SETTING_DELETED"]
			.map((value) => ({ value, label: SPECIAL_LABEL[value] })),
	},
	{
		label: "النشرة البريدية",
		options: [
			"NEWSLETTER_SUBSCRIBE_REQUESTED",
			"NEWSLETTER_SUBSCRIBED",
			"NEWSLETTER_UNSUBSCRIBED",
			"NEWSLETTER_UNSUBSCRIBED_BY_ADMIN",
			"NEWSLETTER_RESUBSCRIBED_BY_ADMIN",
			"NEWSLETTER_SUBSCRIBER_DELETED",
			"NEWSLETTER_SUBSCRIBER_RESTORED",
		].map((value) => ({ value, label: SPECIAL_LABEL[value] })),
	},
]

/**
 * A complete Arabic sentence for actions whose generic "<actor> <verb>
 * <resource>" reading would be wrong or misleading — above all a FAILED login
 * (no actor, and "logged in" would be the opposite of the truth) and the cron's
 * scheduled publish. Returns null for everything else; callers fall back to
 * the generic humanizer.
 */
export function specialAuditLabel(log: Pick<AuditLog, "action" | "changes">): string | null {
	const base = SPECIAL_LABEL[log.action]
	const changes = (log.changes ?? {}) as Record<string, unknown>

	if (log.action === "USER_LOGIN_FAILED") {
		const reason = typeof changes.reason === "string" ? LOGIN_FAILURE_REASON[changes.reason] : null
		return reason ? `${base} — ${reason}` : base
	}
	// The minute cron flips a due scheduled post live: no human did it.
	if (log.action === "POST_PUBLISHED" && changes.scheduled === true) {
		return "نشر تلقائي لخبر بحسب الجدولة"
	}
	return base ?? null
}
