"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Speaker, SpeakerTranslationItem } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { pickTranslation } from "@/lib/i18n"
import { formatArNumber } from "@/lib/dates"
import { Globe, Loader2, MicVocal, Pencil, Plus, Search, Trash2 } from "lucide-react"
import EmptyState from "@/components/ui/EmptyState"
import PageHeader from "@/components/layout/PageHeader"
import Pagination from "@/components/ui/Pagination"
import Modal from "@/components/ui/Modal"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { CardGridSkeleton } from "@/components/ui/Skeleton"
import { useActiveLanguages, languageLabel } from "@/lib/useLanguages"
import {
	useSpeakersList,
	useCreateSpeaker,
	useUpdateSpeaker,
	useDeleteSpeaker,
} from "@/lib/queries/speakers"
import { useTranslationsField } from "@/lib/use-translations-field"
import { useListPage } from "@/lib/use-list-page"

type DialogState =
	| { mode: "create" }
	| { mode: "edit"; speaker: Speaker }
	| null

export default function SpeakersPage() {
	const router = useRouter()
	const { confirm, dialog: confirmDialog } = useConfirm()
	const [dialog, setDialog] = useState<DialogState>(null)
	const { page, setPage, limit, setLimit, search, setSearch, debouncedSearch } =
		useListPage({ initialLimit: 24 })

	const speakersQuery = useSpeakersList({
		page,
		limit,
		search: debouncedSearch || undefined,
	})
	const speakers = speakersQuery.data?.items ?? []
	const total = speakersQuery.data?.pagination.total ?? 0
	const pages = speakersQuery.data?.pagination.pages ?? 1
	const loading = speakersQuery.isLoading

	const deleteSpeaker = useDeleteSpeaker()

	const nameOf = (s: Speaker) =>
		pickTranslation(s.speaker_translations, s.translation)?.name || "بدون اسم"

	const handleDelete = async (s: Speaker) => {
		const ok = await confirm({
			title: `حذف "${nameOf(s)}"؟`,
			description: "سيُنقل إلى سلة المهملات. لا يمكن الحذف ما دامت هناك تسجيلات حيّة منسوبة إليه.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		deleteSpeaker.mutate(s.id, {
			onSuccess: () => toast.success("تم الحذف"),
			// 409 while live audios still reference the speaker — surface server message.
			onError: (e) => toast.error(getErrorMessage(e, "فشل الحذف")),
		})
	}

	const hasFilters = !!debouncedSearch

	return (
		<div className="space-y-6">
			<PageHeader
				title="المحاضرون"
				description="أصحاب التسجيلات الصوتية. كل تسجيل يُنسب إلى محاضر واحد اختيارياً."
				icon={MicVocal}
				actions={
					<div className="flex gap-2">
						<button onClick={() => router.push("/dashboard/speakers/trash")} className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
							<Trash2 className="h-4 w-4" />سلة المهملات
						</button>
						<button onClick={() => setDialog({ mode: "create" })} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 shadow-sm transition-colors">
							<Plus className="h-4 w-4" />محاضر جديد
						</button>
					</div>
				}
			/>

			<div className="bg-white rounded-xl border border-gray-200 p-4">
				<div className="relative max-w-md">
					<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
					<input
						value={search} onChange={(e) => setSearch(e.target.value)}
						placeholder="ابحث في اسم المحاضر..."
						className="w-full pr-9 pl-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
					/>
				</div>
			</div>

			{loading ? (
				<CardGridSkeleton count={8} aspect="aspect-[3/1]" cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
			) : speakers.length === 0 ? (
				<EmptyState
					variant="card"
					icon={MicVocal}
					title={hasFilters ? "لا توجد نتائج" : "لا يوجد محاضرون بعد"}
					description={hasFilters ? "جرّب تغيير كلمة البحث." : "أضف أول محاضر لتنسب إليه التسجيلات الصوتية."}
					action={(
						<button onClick={() => setDialog({ mode: "create" })} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90">
							<Plus className="h-4 w-4" />{hasFilters ? "أضف محاضراً جديداً" : "أضف أول محاضر"}
						</button>
					)}
				/>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{speakers.map((s) => (
						<div key={s.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all">
							<div className="flex items-start justify-between gap-2">
								<div className="flex items-center gap-3 min-w-0">
									<div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
										<MicVocal className="h-5 w-5 text-primary" strokeWidth={1.6} />
									</div>
									<div className="min-w-0">
										<h3 className="text-sm font-semibold text-gray-900 truncate">{nameOf(s)}</h3>
										<p className="text-xs text-gray-500 mt-0.5">{formatArNumber(s.audio_count)} مقطعًا</p>
									</div>
								</div>
								<div className="flex gap-1 shrink-0">
									<button onClick={() => setDialog({ mode: "edit", speaker: s })} className="cursor-pointer p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded" title="تعديل"><Pencil className="h-4 w-4" /></button>
									<button onClick={() => handleDelete(s)} className="cursor-pointer p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="حذف"><Trash2 className="h-4 w-4" /></button>
								</div>
							</div>
							<div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1 text-[11px] text-gray-400">
								<Globe className="h-3 w-3" />{formatArNumber(s.speaker_translations.length)} ترجمة
							</div>
						</div>
					))}
				</div>
			)}

			<Pagination
				page={page}
				pages={pages}
				total={total}
				limit={limit}
				pageSizes={[24, 48, 96]}
				onPage={setPage}
				onLimit={setLimit}
			/>

			{dialog?.mode === "create" && (
				<SpeakerEditor onClose={() => setDialog(null)} />
			)}
			{dialog?.mode === "edit" && (
				<SpeakerEditor initial={dialog.speaker} onClose={() => setDialog(null)} />
			)}
			{confirmDialog}
		</div>
	)
}

function SpeakerEditor({ initial, onClose }: { initial?: Speaker; onClose: () => void }) {
	const { languages } = useActiveLanguages()
	const isEdit = !!initial
	const createSpeaker = useCreateSpeaker()
	const updateSpeaker = useUpdateSpeaker()
	const saving = createSpeaker.isPending || updateSpeaker.isPending

	const seedTranslations = (): SpeakerTranslationItem[] => {
		if (initial?.speaker_translations.length) {
			return initial.speaker_translations.map((t) => ({ ...t }))
		}
		return [{ lang: "ar", name: "", is_default: true }]
	}

	const { translations, activeLang, setActiveLang, updateAt, addLang, removeAt, setDefault } =
		useTranslationsField<SpeakerTranslationItem>({
			initial: seedTranslations(),
			languages,
			makeBlank: (lang) => ({ lang, name: "", is_default: false }),
		})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		const cleaned = translations.filter((t) => t.name.trim())
		if (!cleaned.length) { toast.error("أدخل اسماً واحداً على الأقل"); return }
		// The API requires exactly one is_default — if the default tab was
		// filtered out (empty name), promote the first remaining one.
		if (!cleaned.some((t) => t.is_default)) cleaned[0].is_default = true
		const body = {
			translations: cleaned.map((t) => ({
				lang: t.lang,
				name: t.name.trim(),
				is_default: t.is_default,
			})),
		}
		const handlers = {
			onSuccess: () => {
				toast.success(isEdit ? "تم تحديث المحاضر" : "تم إنشاء المحاضر")
				onClose()
			},
			onError: (err: unknown) => toast.error(getErrorMessage(err, "فشل حفظ المحاضر")),
		}
		if (isEdit && initial) updateSpeaker.mutate({ id: initial.id, body }, handlers)
		else createSpeaker.mutate(body, handlers)
	}

	return (
		<Modal open={true} onClose={onClose} title={isEdit ? "تعديل المحاضر" : "محاضر جديد"} size="md">
			<form onSubmit={handleSubmit}>
				<div className="p-6 space-y-4">
					<div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
						{translations.map((t, i) => (
							<button key={i} type="button" onClick={() => setActiveLang(t.lang)}
								className={`cursor-pointer px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeLang === t.lang ? "border-primary text-primary" : "border-transparent text-gray-500"}`}>
								<Globe className="inline h-4 w-4 ml-1" />{languageLabel(t.lang)}
								{t.is_default && <span className="mr-1 text-xs text-gray-400">(الافتراضية)</span>}
								{translations.length > 1 && (
									<span onClick={(e) => { e.stopPropagation(); removeAt(i) }} className="mr-2 text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 className="inline h-3 w-3" /></span>
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
									<select value={t.lang} onChange={(e) => updateAt(i, { lang: e.target.value } as Partial<SpeakerTranslationItem>)} className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm">
										{languages.map((l) => <option key={l.code} value={l.code}>{languageLabel(l.code, l.native_name)}</option>)}
									</select>
								</div>
								<label className="flex items-center gap-2 cursor-pointer pb-2">
									<input type="checkbox" checked={t.is_default} onChange={() => setDefault(i)} className="h-4 w-4 text-primary rounded" />
									<span className="text-sm">الافتراضية</span>
								</label>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">اسم المحاضر *</label>
								<input
									value={t.name}
									onChange={(e) => updateAt(i, { name: e.target.value } as Partial<SpeakerTranslationItem>)}
									maxLength={300}
									dir={t.lang === "ar" ? "rtl" : "ltr"}
									placeholder="الدكتور أبو زهراء النجدي"
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
