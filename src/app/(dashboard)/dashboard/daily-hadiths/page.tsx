"use client"

import { useState } from "react"
import type { DailyHadith, DailyHadithTranslation } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { Loader2, BookOpenText, Plus, Pencil, Trash2, Pin, PinOff, Globe, Power, Eye, EyeOff } from "lucide-react"
import { format } from "date-fns"
import EmptyState from "@/components/ui/EmptyState"
import PageHeader from "@/components/layout/PageHeader"
import Modal from "@/components/ui/Modal"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { ListSkeleton } from "@/components/ui/Skeleton"
import { useActiveLanguages, languageLabel } from "@/lib/useLanguages"
import {
	useDailyHadithsList,
	useTodayHadith,
	useHadithPins,
	useCreateHadith,
	useUpdateHadith,
	useDeleteHadith,
	usePinHadith,
	useUnpinHadith,
} from "@/lib/queries/daily-hadiths"

type DialogState =
	| { mode: "create" }
	| { mode: "edit"; hadith: DailyHadith }
	| { mode: "pin"; hadith: DailyHadith }
	| null

export default function DailyHadithsPage() {
	const { confirm, dialog: confirmDialog } = useConfirm()
	const [dialog, setDialog] = useState<DialogState>(null)

	const listQuery = useDailyHadithsList({ limit: 100 })
	const todayQuery = useTodayHadith()
	const pinsQuery = useHadithPins()

	const hadiths = listQuery.data?.items ?? []
	const today = todayQuery.data
	const pins = pinsQuery.data ?? []

	const updateHadith = useUpdateHadith()
	const deleteHadith = useDeleteHadith()
	const unpinHadith = useUnpinHadith()

	const toggleActive = (h: DailyHadith) => {
		updateHadith.mutate(
			{ id: h.id, body: { is_active: !h.is_active } },
			{
				onSuccess: () => toast.success(h.is_active ? "تم التعطيل" : "تم التفعيل"),
				onError: (e) => toast.error(getErrorMessage(e, "فشل التحديث")),
			},
		)
	}

	const handleDelete = async (h: DailyHadith) => {
		const ok = await confirm({
			title: "حذف هذا الحديث؟",
			description: "سيُحذف من التدوير. أيّ تثبيتات على تواريخ مستقبلية ستصبح غير فعّالة.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		deleteHadith.mutate(h.id, {
			onSuccess: () => toast.success("تم الحذف"),
			onError: (e) => toast.error(getErrorMessage(e, "فشل الحذف")),
		})
	}

	const handleUnpin = (pin_date: string) => {
		unpinHadith.mutate(pin_date, {
			onSuccess: () => toast.success("أُلغي التثبيت"),
			onError: (e) => toast.error(getErrorMessage(e, "فشل")),
		})
	}

	const previewOf = (h: DailyHadith) => {
		const t = h.translation ?? h.daily_hadith_translations[0]
		return t?.content || ""
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="الأحاديث اليومية"
				description="حديث واحد لكل يوم على الصفحة الرئيسية. يدور تلقائياً عبر الأحاديث النشطة، أو ثبّت حديثاً لتاريخ محدّد."
				icon={BookOpenText}
				actions={
					<button onClick={() => setDialog({ mode: "create" })} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
						<Plus className="h-4 w-4" />حديث جديد
					</button>
				}
			/>

			{today && (
				<div className="bg-linear-to-l from-primary/5 to-secondary/5 border border-primary/20 rounded-xl p-5">
					<div className="flex items-center gap-2 mb-2">
						<span className="text-xs font-semibold text-primary uppercase tracking-wide">حديث اليوم</span>
						{today.is_pinned && <span className="px-2 py-0.5 text-[10px] bg-secondary/20 text-secondary-foreground rounded-full inline-flex items-center gap-1"><Pin className="h-2.5 w-2.5" />مثبّت</span>}
					</div>
					<p className="text-base text-gray-900 leading-loose">{today.content}</p>
					{today.source && <p className="text-xs text-gray-500 mt-2">— {today.source}</p>}
				</div>
			)}

			{pins.length > 0 && (
				<div className="bg-white border border-gray-200 rounded-xl p-4">
					<h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
						<Pin className="h-4 w-4" />التثبيتات المجدولة ({pins.length})
					</h3>
					<div className="flex flex-wrap gap-2">
						{pins.map((p) => (
							<div key={p.pin_date} className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md text-xs">
								<span className="text-amber-900 font-mono">{p.pin_date}</span>
								<button onClick={() => handleUnpin(p.pin_date)} className="cursor-pointer text-amber-700 hover:text-red-600" title="إلغاء التثبيت">
									<PinOff className="h-3 w-3" />
								</button>
							</div>
						))}
					</div>
				</div>
			)}

			{listQuery.isLoading ? (
				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<ListSkeleton rows={5} />
				</div>
			) : hadiths.length === 0 ? (
				<EmptyState
					variant="card"
					icon={BookOpenText}
					title="لا توجد أحاديث بعد"
					description="أضف أوّل حديث ليبدأ التدوير اليومي على الصفحة الرئيسية."
					action={(
						<button onClick={() => setDialog({ mode: "create" })} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90">
							<Plus className="h-4 w-4" />أضف أوّل حديث
						</button>
					)}
				/>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{hadiths.map((h) => (
						<div key={h.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all">
							<div className="flex items-start justify-between mb-3">
								<div className="flex items-center gap-2">
									<span className="text-[11px] font-mono text-gray-400">#{h.display_order ?? "—"}</span>
									<button onClick={() => toggleActive(h)} className={`cursor-pointer text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${h.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
										{h.is_active ? <><Eye className="h-3 w-3" />نشط</> : <><EyeOff className="h-3 w-3" />معطّل</>}
									</button>
									<span className="text-[11px] text-gray-400 inline-flex items-center gap-1">
										<Globe className="h-3 w-3" />{h.daily_hadith_translations.length} ترجمة
									</span>
								</div>
								<div className="flex gap-1">
									<button onClick={() => setDialog({ mode: "pin", hadith: h })} className="cursor-pointer p-1.5 text-gray-400 hover:text-secondary hover:bg-secondary/10 rounded" title="تثبيت لتاريخ"><Pin className="h-4 w-4" /></button>
									<button onClick={() => setDialog({ mode: "edit", hadith: h })} className="cursor-pointer p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded" title="تعديل"><Pencil className="h-4 w-4" /></button>
									<button onClick={() => toggleActive(h)} className="cursor-pointer p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded" title={h.is_active ? "تعطيل" : "تفعيل"}><Power className="h-4 w-4" /></button>
									<button onClick={() => handleDelete(h)} className="cursor-pointer p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="حذف"><Trash2 className="h-4 w-4" /></button>
								</div>
							</div>
							<p className="text-sm text-gray-800 leading-relaxed line-clamp-4">{previewOf(h)}</p>
						</div>
					))}
				</div>
			)}

			{dialog?.mode === "create" && (
				<HadithEditor onClose={() => setDialog(null)} />
			)}
			{dialog?.mode === "edit" && (
				<HadithEditor initial={dialog.hadith} onClose={() => setDialog(null)} />
			)}
			{dialog?.mode === "pin" && (
				<PinDialog hadith={dialog.hadith} onClose={() => setDialog(null)} />
			)}
			{confirmDialog}
		</div>
	)
}

function HadithEditor({ initial, onClose }: { initial?: DailyHadith; onClose: () => void }) {
	const { languages } = useActiveLanguages()
	const isEdit = !!initial
	const createHadith = useCreateHadith()
	const updateHadith = useUpdateHadith()
	const saving = createHadith.isPending || updateHadith.isPending

	const [translations, setTranslations] = useState<DailyHadithTranslation[]>(
		initial?.daily_hadith_translations.length
			? initial.daily_hadith_translations.map((t) => ({ ...t }))
			: [{ lang: "ar", content: "", source: null, is_default: true }],
	)
	const [isActive, setIsActive] = useState(initial?.is_active ?? true)
	const [activeLang, setActiveLang] = useState(translations[0].lang)

	const updateT = (i: number, patch: Partial<DailyHadithTranslation>) => {
		setTranslations((prev) => prev.map((t, idx) => idx === i ? { ...t, ...patch } : t))
	}

	const addLang = () => {
		const used = translations.map((t) => t.lang)
		const next = languages.find((l) => !used.includes(l.code))
		if (!next) { toast.error("لا توجد لغات إضافية"); return }
		setTranslations([...translations, { lang: next.code, content: "", source: null, is_default: false }])
		setActiveLang(next.code)
	}

	const removeLang = (i: number) => {
		const next = translations.filter((_, idx) => idx !== i)
		setTranslations(next.length ? next : [{ lang: "ar", content: "", source: null, is_default: true }])
		if (translations[i].lang === activeLang) setActiveLang(next[0]?.lang ?? "ar")
	}

	const setDefault = (i: number) => {
		setTranslations(translations.map((t, idx) => ({ ...t, is_default: idx === i })))
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		const cleaned = translations.filter((t) => t.content.trim())
		if (!cleaned.length) { toast.error("أضف نصاً واحداً على الأقل"); return }
		if (!cleaned.some((t) => t.is_default)) cleaned[0].is_default = true
		const body = {
			is_active: isActive,
			translations: cleaned.map((t) => ({
				lang: t.lang,
				content: t.content,
				source: t.source || undefined,
				is_default: t.is_default,
			})),
		}
		const handlers = {
			onSuccess: () => {
				toast.success(isEdit ? "تم التحديث" : "تم الإنشاء")
				onClose()
			},
			onError: (e: unknown) => toast.error(getErrorMessage(e, "فشل الحفظ")),
		}
		if (isEdit && initial) updateHadith.mutate({ id: initial.id, body }, handlers)
		else createHadith.mutate(body, handlers)
	}

	return (
		<Modal open={true} onClose={onClose} title={isEdit ? "تعديل الحديث" : "حديث جديد"} size="lg">
			<form onSubmit={handleSubmit}>
				<div className="p-6 space-y-4">
					<div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
						{translations.map((t, i) => (
							<button key={i} type="button" onClick={() => setActiveLang(t.lang)}
								className={`cursor-pointer px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeLang === t.lang ? "border-primary text-primary" : "border-transparent text-gray-500"}`}>
								<Globe className="inline h-4 w-4 ml-1" />{languageLabel(t.lang)}
								{t.is_default && <span className="mr-1 text-xs text-gray-400">(الافتراضية)</span>}
								{translations.length > 1 && (
									<span onClick={(e) => { e.stopPropagation(); removeLang(i) }} className="mr-2 text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 className="inline h-3 w-3" /></span>
								)}
							</button>
						))}
						<button type="button" onClick={addLang} className="cursor-pointer px-3 py-2 text-xs text-primary hover:underline whitespace-nowrap"><Plus className="inline h-3 w-3 ml-1" />إضافة لغة</button>
					</div>

					{translations.map((t, i) => (
						<div key={i} className={activeLang === t.lang ? "block space-y-3" : "hidden"}>
							<div className="flex items-end gap-3">
								<div className="flex-1">
									<label className="block text-xs font-medium text-gray-500 mb-1">اللغة</label>
									<select value={t.lang} onChange={(e) => updateT(i, { lang: e.target.value })} className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm">
										{languages.map((l) => <option key={l.code} value={l.code}>{languageLabel(l.code, l.native_name)}</option>)}
									</select>
								</div>
								<label className="flex items-center gap-2 cursor-pointer pb-2">
									<input type="checkbox" checked={t.is_default} onChange={() => setDefault(i)} className="h-4 w-4 text-primary rounded" />
									<span className="text-sm">الافتراضية</span>
								</label>
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
									required
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

					<label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-gray-200">
						<input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 text-primary rounded" />
						<span className="text-sm">نشط — يدخل في التدوير اليومي</span>
					</label>
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

function PinDialog({ hadith, onClose }: { hadith: DailyHadith; onClose: () => void }) {
	const pinHadith = usePinHadith()
	const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		pinHadith.mutate(
			{ pin_date: date, hadith_id: hadith.id },
			{
				onSuccess: () => { toast.success("تم التثبيت"); onClose() },
				onError: (e) => toast.error(getErrorMessage(e, "فشل التثبيت")),
			},
		)
	}

	const preview = hadith.translation?.content ?? hadith.daily_hadith_translations[0]?.content ?? ""

	return (
		<Modal open={true} onClose={onClose} title="تثبيت الحديث لتاريخ" size="md">
			<form onSubmit={handleSubmit}>
				<div className="p-6 space-y-4">
					<div className="bg-gray-50 border border-gray-200 rounded-md p-3">
						<p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">{preview}</p>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
						<input
							type="date"
							required
							value={date}
							onChange={(e) => setDate(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
						/>
						<p className="mt-1 text-[11px] text-gray-500">سيظهر هذا الحديث على الصفحة الرئيسية في التاريخ المحدّد، متجاوزاً التدوير الطبيعي.</p>
					</div>
				</div>
				<div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-200 bg-gray-50">
					<button type="button" onClick={onClose} className="cursor-pointer px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-white">إلغاء</button>
					<button type="submit" disabled={pinHadith.isPending} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50">
						{pinHadith.isPending && <Loader2 className="h-4 w-4 animate-spin" />}تثبيت
					</button>
				</div>
			</form>
		</Modal>
	)
}
