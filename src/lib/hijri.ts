/**
 * The twelve Hijri months, in the exact wording the API returns as
 * `month_name` (worker/src/lib/hijri.ts). The CMS never computes a Hijri
 * date: the API follows the date Najaf announces on sistani.org, which can
 * differ by a day from Umm al-Qura or `Intl`'s Hijri calendar.
 */
export const HIJRI_MONTHS = [
	"محرم",
	"صفر",
	"ربيع الأول",
	"ربيع الآخر",
	"جمادى الأولى",
	"جمادى الآخرة",
	"رجب",
	"شعبان",
	"شهر رمضان",
	"شوال",
	"ذو القعدة",
	"ذو الحجة",
] as const

/** 1–12 → the month's name; anything else → "". */
export function hijriMonthName(month: number | null | undefined): string {
	if (!month || month < 1 || month > 12) return ""
	return HIJRI_MONTHS[month - 1]
}

/** "9 جمادى الأولى" — or null when the hadith has no day on the calendar. */
export function formatHijriDay(
	month: number | null | undefined,
	day: number | null | undefined,
): string | null {
	if (!month || !day) return null
	return `${day} ${hijriMonthName(month)}`
}
