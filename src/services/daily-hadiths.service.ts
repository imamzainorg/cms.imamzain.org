import { api } from "@/lib/api"
import type {
	DailyHadith,
	DailyHadithToday,
	HadithCalendarItem,
	HijriToday,
	PaginatedResponse,
} from "@/types"

type TranslationInput = {
	lang: string
	content: string
	source?: string | null
}

/**
 * A hadith's Hijri day. `hijri_month` and `hijri_day` go together: send both,
 * or (on PATCH) both `null` to take the hadith off the calendar. One alone is
 * a 400. Omitting both on PATCH leaves the day untouched.
 */
type HijriDayFields = {
	hijri_month?: number | null
	hijri_day?: number | null
}

export const dailyHadithsService = {
	// Public: the hadith for today's Hijri day. `data` is null when that day
	// has none; the response's `meta.hijri` carries today's Hijri date.
	today: () => api.get<DailyHadithToday>("/daily-hadiths/today"),

	// Public: today's Hijri date as sistani.org announces it.
	hijriDate: () => api.get<HijriToday>("/daily-hadiths/hijri-date"),

	// Sets *today's* Hijri date by hand, for the rare day the announcement and
	// sistani.org disagree. Needs daily-hadiths:update.
	setHijriDate: (body: { year: number; month: number; day: number }) =>
		api.put<HijriToday>("/daily-hadiths/hijri-date", body),

	// Public browse in Hijri calendar order (hadiths without a day come last).
	// `hijri_day` alone is a 400 — it requires `hijri_month`.
	calendar: (params?: { page?: number; limit?: number; hijri_month?: number; hijri_day?: number }) =>
		api.get<PaginatedResponse<HadithCalendarItem>>("/daily-hadiths", { params }),

	// Admin list/detail live under /admin — the bare paths are the public ones.
	// The admin list is newest-first; the CMS page browses with `calendar`.
	list: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<DailyHadith>>("/daily-hadiths/admin", { params }),

	get: (id: string) => api.get<DailyHadith>(`/daily-hadiths/admin/${id}`),

	// 409 when another live hadith already holds the Hijri day.
	create: (body: HijriDayFields & { translations: TranslationInput[] }) =>
		api.post<DailyHadith>("/daily-hadiths", body),

	// Answers `data: null`, not the row.
	update: (id: string, body: HijriDayFields & { translations?: TranslationInput[] }) =>
		api.patch<DailyHadith>(`/daily-hadiths/${id}`, body),

	remove: (id: string) => api.delete(`/daily-hadiths/${id}`),

	trash: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<DailyHadith>>("/daily-hadiths/trash", { params }),

	// Answers `data: null`; the result is in `message` and `meta`
	// (see HadithRestoreMeta). Never a 409: if the Hijri day was taken in the
	// meantime the hadith comes back WITHOUT a day.
	restore: (id: string) => api.post<null>(`/daily-hadiths/${id}/restore`),
}
