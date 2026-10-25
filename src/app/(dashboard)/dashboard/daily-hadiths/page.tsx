"use client"

import { useState } from "react"
import type { DailyHadith, DailyHadithTranslation, HadithCalendarItem } from "@/types"
import { toast } from "sonner"
import { getErrorMessage, getErrorStatus } from "@/lib/api"
import {
	Loader2,
	BookOpenText,
	Plus,
	Pencil,
	Trash2,
	CalendarDays,
	CalendarClock,
	Globe,
	AlertTriangle,
} from "lucide-react"
import EmptyState from "@/components/ui/EmptyState"
import PageHeader from "@/components/layout/PageHeader"
import Modal from "@/components/ui/Modal"
import Pagination from "@/components/ui/Pagination"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { ListSkeleton } from "@/components/ui/Skeleton"
import { useActiveLanguages, languageLabel } from "@/lib/useLanguages"
import {
	useHadithCalendar,
	useDailyHadith,
	useTodayHadith,
	useHijriDate,
	useSetHijriDate,
	useCreateHadith,
	useUpdateHadith,
	useDeleteHadith,
} from "@/lib/queries/daily-hadiths"
import { useTranslationsField } from "@/lib/use-translations-field"
import { useHasPermission } from "@/lib/permissions"
import { HIJRI_MONTHS, formatHijriDay, hijriMonthName } from "@/lib/hijri"
import Select from "@/components/ui/Select"

type DialogState =
	| { mode: "create" }
	| { mode: "edit"; id: string }
	| { mode: "hijri-date" }
	| null

const PAGE_SIZES = [30, 60, 100]

export default function DailyHadithsPage() {
	const { confirm, dialog: confirmDialog } = useConfirm()
	const [dialog, setDialog] = useState<DialogState>(null)
	const [page, setPage] = useState(1)
	const [limit, setLimit] = useState(PAGE_SIZES[0])
	// "" = every month, calendar order, hadiths without a day last.
	const [month, setMonth] = useState("")

	const calendarQuery = useHadithCalendar({
		page,
		limit,
		...(month ? { hijri_month: Number(month) } : {}),
	})
	const canUpdate = useHasPermission("daily-hadiths:update")

	const hadiths = calendarQuery.data?.items ?? []
	const total = calendarQuery.data?.pagination.total ?? 0
	const pages = calendarQuery.data?.pagination.pages ?? 1

	const deleteHadith = useDeleteHadith()

	const handleDelete = async (h: HadithCalendarItem) => {
		const day = formatHijriDay(h.hijri_month, h.hijri_day)
		const ok = await confirm({
			title: "حذف هذا الحديث؟",
			description: day
				? `سيُحذف الحديث، ويصبح يوم ${day} متاحاً لحديث آخر فوراً. يمكنك استعادته من سلة المهملات.`
				: "سيُنقل الحديث إلى سلة المهملات.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		deleteHadith.mutate(h.id, {
			onSuccess: () => toast.success("تم الحذف"),
			onError: (e) => toast.error(getErrorMessage(e, "فشل الحذف")),
		})
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="الأحاديث اليومية"
				description="لكل يوم من أيام السنة الهجرية حديث واحد، يُعرض في ذلك اليوم من كل عام بحسب التاريخ الهجري الذي يعلنه مكتب السيد السيستاني. الحديث بلا يوم محفوظ لكنه لا يظهر على الموقع."
				icon={BookOpenText}
				actions={
					<button onClick={() => setDialog({ mode: "create" })} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
						<Plus className="h-4 w-4" />حديث جديد
					</button>
				}
			/>

			<TodayCard canSetDate={canUpdate} onSetDate={() => setDialog({ mode: "hijri-date" })} />

			<div className="flex flex-wrap items-center gap-3">
				<label htmlFor="hadith-month" className="text-sm font-medium text-gray-700">الشهر الهجري</label>
				<Select
					id="hadith-month"
					value={month}
					onChange={(e) => { setMonth(e.target.value); setPage(1) }}
					className="cursor-pointer px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm bg-white"
				>
					<option value="">كل الأشهر (بحسب ترتيب التقويم)</option>
					{HIJRI_MONTHS.map((name, i) => (
						<option key={name} value={i + 1}>{name}</option>
					))}
				</Select>
				{!month && (
					<span className="text-xs text-gray-500">الأحاديث التي بلا يوم تظهر في آخر القائمة.</span>
				)}
			</div>

			{calendarQuery.isLoading ? (
				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<ListSkeleton rows={5} />
				</div>
			) : hadiths.length === 0 ? (
				<EmptyState
					variant="card"
					icon={BookOpenText}
					title={month ? `لا توجد أحاديث في شهر ${hijriMonthName(Number(month))}` : "لا توجد أحاديث بعد"}
					description="أضف حديثاً وحدّد له اليوم الهجري الذي يُعرض فيه كل عام."
					action={(
						<button onClick={() => setDialog({ mode: "create" })} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90">
							<Plus className="h-4 w-4" />أضف حديثاً
						</button>
					)}
				/>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{hadiths.map((h) => {
						const day = formatHijriDay(h.hijri_month, h.hijri_day)
						return (
							<div key={h.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all">
								<div className="flex items-start justify-between mb-3">
									{day ? (
										<span className="text-xs font-medium inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-white">
											<CalendarDays className="h-3.5 w-3.5" />{day}
										</span>
									) : (
										<span className="text-xs inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700" title="لن يظهر هذا الحديث على الموقع حتى يُحدَّد له يوم">
											<AlertTriangle className="h-3.5 w-3.5" />بلا يوم — لا يظهر على الموقع
										</span>
									)}
									<div className="flex gap-1">
										<button onClick={() => setDialog({ mode: "edit", id: h.id })} className="cursor-pointer p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded" title="تعديل"><Pencil className="h-4 w-4" /></button>
										<button onClick={() => handleDelete(h)} className="cursor-pointer p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="حذف"><Trash2 className="h-4 w-4" /></button>
									</div>
								</div>
								<p className="text-sm text-gray-800 leading-relaxed line-clamp-4">{h.content}</p>
								{h.source && <p className="text-xs text-gray-500 mt-2">— {h.source}</p>}
							</div>
						)
					})}
				</div>
			)}

			<Pagination
				page={page} pages={pages} total={total} limit={limit}
				pageSizes={PAGE_SIZES}
				onPage={setPage}
				onLimit={(n) => { setLimit(n); setPage(1) }}
			/>

			{dialog?.mode === "create" && (
				<HadithEditor onClose={() => setDialog(null)} />
			)}
			{dialog?.mode === "edit" && (
				<HadithEditorLoader id={dialog.id} onClose={() => setDialog(null)} />
			)}
			{dialog?.mode === "hijri-date" && (
				<SetHijriDateModal onClose={() => setDialog(null)} />
			)}
			{confirmDialog}
		</div>
	)
}

/** Today's Hijri date (from the API, never computed here) and today's hadith. */
function TodayCard({ canSetDate, onSetDate }: { canSetDate: boolean; onSetDate: () => void }) {
	const todayQuery = useTodayHadith()
	const hijri = todayQuery.data?.meta?.hijri
	const hadith = todayQuery.data?.hadith

	if (todayQuery.isLoading) {
		return <div className="bg-white border border-gray-200 rounded-xl p-5 h-28 animate-pulse" />
	}
	if (todayQuery.isError) {
		return (
			<div className="bg-white border border-red-200 rounded-xl p-5 text-sm text-red-700">
				تعذّر تحميل حديث اليوم والتاريخ الهجري.
			</div>
		)
	}

	return (
		<div className="bg-linear-to-l from-primary/5 to-secondary/5 border border-primary/20 rounded-xl p-5">
			<div className="flex flex-wrap items-center justify-between gap-2 mb-3">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-xs font-semibold text-primary tracking-wide">حديث اليوم</span>
					{hijri && (
						<span className="text-sm font-medium text-gray-900">
							{hijri.day} {hijri.month_name} {hijri.year} هـ
						</span>
					)}
					{hijri?.provisional && (
						<span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700" title="لم يُقرأ بعد إعلان بداية الشهر من موقع المكتب، فهذا اليوم تقديري إلى أن يتحقق النظام منه خلال ساعة تقريباً.">
							مؤقت — بانتظار إعلان الشهر
						</span>
					)}
					{hijri?.source === "manual" && (
						<span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">مضبوط يدوياً</span>
					)}
					{hijri?.source === "calendar" && (
						<span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600" title="تقويم أم القرى — يُستعمل فقط إلى أن يُقرأ موقع المكتب">
							تقويم أم القرى
						</span>
					)}
				</div>
				{canSetDate && (
					<button onClick={onSetDate} className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
						<CalendarClock className="h-3.5 w-3.5" />ضبط التاريخ الهجري يدوياً
					</button>
				)}
			</div>
			{hadith ? (
				<>
					<p className="text-base text-gray-900 leading-loose">{hadith.content}</p>
					{hadith.source && <p className="text-xs text-gray-500 mt-2">— {hadith.source}</p>}
				</>
			) : (
				<p className="text-sm text-gray-600">لا يوجد حديث لهذا اليوم الهجري — أضف حديثاً وحدّد له هذا اليوم.</p>
			)}
		</div>
	)
}

/** Corrects *today's* Hijri date when the announcement and sistani.org disagree. */
function SetHijriDateModal({ onClose }: { onClose: () => void }) {
	const hijriQuery = useHijriDate()
	const setDate = useSetHijriDate()
	const current = hijriQuery.data

	const [year, setYear] = useState<string>("")
	const [month, setMonth] = useState<string>("")
	const [day, setDay] = useState<string>("")
	// Seed from the live date once it arrives, without clobbering later edits.
	const [seeded, setSeeded] = useState(false)
	if (current && !seeded) {
		setSeeded(true)
		setYear(String(current.year))
		setMonth(String(current.month))
		setDay(String(current.day))
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		const y = Number(year), m = Number(month), d = Number(day)
		if (!Number.isInteger(y) || y < 1300 || y > 1700) { toast.error("أدخل سنة هجرية صحيحة"); return }
		if (!m) { toast.error("اختر الشهر"); return }
		if (!Number.isInteger(d) || d < 1 || d > 30) { toast.error("اليوم بين 1 و30"); return }
		setDate.mutate(
			{ year: y, month: m, day: d },
			{
				onSuccess: () => { toast.success("تم ضبط تاريخ اليوم الهجري"); onClose() },
				onError: (err) => toast.error(getErrorMessage(err, "فشل ضبط التاريخ")),
			},
		)
	}

	return (
		<Modal open onClose={onClose} title="ضبط تاريخ اليوم الهجري" size="md">
			<form onSubmit={handleSubmit}>
				<div className="p-6 space-y-4">
					<p className="text-xs text-gray-600 leading-relaxed">
						يتبع الموقع تاريخ موقع مكتب السيد السيستاني تلقائياً. استعمل هذا الضبط فقط في اليوم النادر الذي يختلف فيه الإعلان عن الموقع. يصبح التاريخ المُدخل هو تاريخ <strong>اليوم</strong>، ويستمر العدّ منه.
					</p>
					{hijriQuery.isLoading ? (
						<div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
					) : (
						<div className="grid grid-cols-3 gap-3">
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">اليوم</label>
								<input type="number" min={1} max={30} value={day} onChange={(e) => setDay(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" required />
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">الشهر</label>
								<Select value={month} onChange={(e) => setMonth(e.target.value)} className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white" required>
									<option value="" disabled>اختر</option>
									{HIJRI_MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
								</Select>
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">السنة</label>
								<input type="number" min={1300} max={1700} value={year} onChange={(e) => setYear(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" required />
							</div>
						</div>
					)}
					<p className="text-[11px] text-gray-500">اليوم 30 يعني أيضاً أن الشهر 30 يوماً.</p>
				</div>
				<div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-200 bg-gray-50">
					<button type="button" onClick={onClose} className="cursor-pointer px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-white">إلغاء</button>
					<button type="submit" disabled={setDate.isPending || hijriQuery.isLoading} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50">
						{setDate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}حفظ
					</button>
				</div>
			</form>
		</Modal>
	)
}

/**
 * The calendar list carries one resolved language per hadith; editing needs
 * every translation, so load the admin record first. Opening the editor on
 * the list row would silently drop the other languages on save.
 */
function HadithEditorLoader({ id, onClose }: { id: string; onClose: () => void }) {
	const query = useDailyHadith(id)
	if (query.isError) {
		return (
			<Modal open onClose={onClose} title="تعديل الحديث" size="sm">
				<div className="p-6 text-sm text-red-700">{getErrorMessage(query.error, "تعذّر تحميل الحديث")}</div>
			</Modal>
		)
	}
	if (!query.data) {
		return (
			<Modal open onClose={onClose} title="تعديل الحديث" size="sm">
				<div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
			</Modal>
		)
	}
	return <HadithEditor initial={query.data} onClose={onClose} />
}

function HadithEditor({ initial, onClose }: { initial?: DailyHadith; onClose: () => void }) {
	const { languages } = useActiveLanguages()
	const isEdit = !!initial
	const createHadith = useCreateHadith()
	const updateHadith = useUpdateHadith()
	const saving = createHadith.isPending || updateHadith.isPending

	const [hijriMonth, setHijriMonth] = useState(initial?.hijri_month ? String(initial.hijri_month) : "")
	const [hijriDay, setHijriDay] = useState(initial?.hijri_day ? String(initial.hijri_day) : "")
	// Languages already stored server-side. PATCH only UPSERTS the translations
	// in the payload — it never deletes ones left out — so a persisted tab can't
	// truly be removed from here. We therefore only allow removing tabs added
	// in THIS session.
	const persistedLangs = new Set(initial?.daily_hadith_translations.map((t) => t.lang) ?? [])
	// On create, seed ar/en/fa tabs so the editor sees all expected languages
	// up-front. Empty tabs are filtered out at submit time.
	const seedTranslations = (): DailyHadithTranslation[] => {
		if (initial?.daily_hadith_translations.length) {
			return initial.daily_hadith_translations.map((t) => ({ ...t }))
		}
		const seedLangs = ["ar", "en", "fa"]
		return seedLangs
			.filter((code) => languages.some((l) => l.code === code))
			.map((code) => ({ lang: code, content: "", source: null }))
	}
	const { translations, activeLang, setActiveLang, updateAt: updateT, addLang, removeAt: removeLang } =
		useTranslationsField<DailyHadithTranslation>({
			initial: seedTranslations(),
			languages,
			makeBlank: (lang) => ({ lang, content: "", source: null }),
			requireDefault: false,
		})

	const monthNum = hijriMonth ? Number(hijriMonth) : null
	const dayNum = hijriDay ? Number(hijriDay) : null
	const dayChanged = monthNum !== (initial?.hijri_month ?? null) || dayNum !== (initial?.hijri_day ?? null)

	// Who holds the chosen day right now? Telling the editor before they hit
	// save beats a bare 409 afterwards.
	const holderQuery = useHadithCalendar(
		{ hijri_month: monthNum ?? undefined, hijri_day: dayNum ?? undefined, limit: 1 },
		{ enabled: !!monthNum && !!dayNum && dayChanged },
	)
	const holder = holderQuery.data?.items.find((h) => h.id !== initial?.id)

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if ((monthNum === null) !== (dayNum === null)) {
			toast.error("حدّد الشهر واليوم معاً، أو اتركهما فارغين")
			return
		}
		const cleaned = translations.filter((t) => t.content.trim())
		if (!cleaned.length) { toast.error("أضف نصاً واحداً على الأقل"); return }
		const translationsBody = cleaned.map((t) => ({
			lang: t.lang,
			content: t.content,
			source: t.source || undefined,
		}))
		const handlers = {
			onSuccess: () => {
				toast.success(isEdit ? "تم التحديث" : "تم الإنشاء")
				onClose()
			},
			onError: (err: unknown) => {
				if (getErrorStatus(err) === 409) {
					toast.error("هذا اليوم الهجري محجوز لحديث آخر — اختر يوماً آخر أو غيّر يوم الحديث الآخر أولاً.")
					return
				}
				toast.error(getErrorMessage(err, "فشل الحفظ"))
			},
		}
		if (isEdit && initial) {
			// null/null takes the hadith off the calendar; omitting both would
			// leave its day alone, so only send the pair when it is being set
			// or deliberately cleared.
			updateHadith.mutate(
				{
					id: initial.id,
					body: {
						...(dayChanged ? { hijri_month: monthNum, hijri_day: dayNum } : {}),
						translations: translationsBody,
					},
				},
				handlers,
			)
		} else {
			createHadith.mutate(
				{
					...(monthNum && dayNum ? { hijri_month: monthNum, hijri_day: dayNum } : {}),
					translations: translationsBody,
				},
				handlers,
			)
		}
	}

	return (
		<Modal open={true} onClose={onClose} title={isEdit ? "تعديل الحديث" : "حديث جديد"} size="lg">
			<form onSubmit={handleSubmit}>
				<div className="p-6 space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">اليوم الهجري الذي يُعرض فيه</label>
						<div className="grid grid-cols-2 gap-3 max-w-md">
							<Select
								value={hijriMonth}
								onChange={(e) => { setHijriMonth(e.target.value); if (!e.target.value) setHijriDay("") }}
								aria-label="الشهر الهجري"
								className="cursor-pointer px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm bg-white"
							>
								<option value="">بلا يوم</option>
								{HIJRI_MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
							</Select>
							<Select
								value={hijriDay}
								onChange={(e) => setHijriDay(e.target.value)}
								disabled={!hijriMonth}
								aria-label="اليوم من الشهر"
								className="cursor-pointer px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
							>
								<option value="">اليوم</option>
								{Array.from({ length: 30 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
							</Select>
						</div>
						<p className="mt-1 text-[11px] text-gray-500">
							يُعرض الحديث في هذا اليوم من كل عام. الحديث بلا يوم يبقى محفوظاً لكنه لا يظهر على الموقع. إن كان الشهر 29 يوماً فحديث اليوم 30 يُتخطّى في تلك السنة.
						</p>
						{holder && (
							<p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 leading-relaxed">
								<AlertTriangle className="inline h-3.5 w-3.5 ml-1" />
								اليوم {formatHijriDay(monthNum, dayNum)} محجوز لحديث آخر: «{holder.content.length > 80 ? `${holder.content.slice(0, 80)}…` : holder.content}». لن يُحفظ هذا الحديث في اليوم نفسه — غيّر يوم الحديث الآخر أولاً.
							</p>
						)}
					</div>

					<div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
						{translations.map((t, i) => (
							<button key={i} type="button" onClick={() => setActiveLang(t.lang)}
								className={`cursor-pointer px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeLang === t.lang ? "border-primary text-primary" : "border-transparent text-gray-500"}`}>
								<Globe className="inline h-4 w-4 ml-1" />{languageLabel(t.lang)}
								{translations.length > 1 && !persistedLangs.has(t.lang) && (
									<span onClick={(e) => { e.stopPropagation(); removeLang(i) }} className="mr-2 text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 className="inline h-3 w-3" /></span>
								)}
							</button>
						))}
						<button type="button" onClick={addLang} className="cursor-pointer px-3 py-2 text-xs text-primary hover:underline whitespace-nowrap"><Plus className="inline h-3 w-3 ml-1" />إضافة لغة</button>
					</div>

					{translations.map((t, i) => (
						<div key={i} className={activeLang === t.lang ? "block space-y-3" : "hidden"}>
							<div>
								<label className="block text-xs font-medium text-gray-500 mb-1">اللغة</label>
								<Select value={t.lang} onChange={(e) => updateT(i, { lang: e.target.value })} className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm">
									{languages.map((l) => <option key={l.code} value={l.code}>{languageLabel(l.code, l.native_name)}</option>)}
								</Select>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">نص الحديث *</label>
								<textarea
									value={t.content}
									onChange={(e) => updateT(i, { content: e.target.value })}
									rows={5}
									maxLength={4000}
									dir={t.lang === "ar" ? "rtl" : "ltr"}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm leading-relaxed"
								/>
								<p className="mt-1 text-[11px] text-gray-400">{t.content.length} / 4000 حرف</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">المصدر</label>
								<input
									value={t.source ?? ""}
									onChange={(e) => updateT(i, { source: e.target.value })}
									maxLength={500}
									placeholder="نهج البلاغة، باب الزهد، حديث رقم..."
									dir={t.lang === "ar" ? "rtl" : "ltr"}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
								/>
							</div>
						</div>
					))}
				</div>
				<div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-200 bg-gray-50">
					<button type="button" onClick={onClose} className="cursor-pointer px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-white">إلغاء</button>
					<button type="submit" disabled={saving} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50">
						{saving && <Loader2 className="h-4 w-4 animate-spin" />}حفظ
					</button>
				</div>
			</form>
		</Modal>
	)
}
