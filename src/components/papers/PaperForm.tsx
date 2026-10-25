"use client"

import { useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { AcademicPaper } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { categoryName } from "@/lib/i18n"
import { useActiveLanguages, languageLabel } from "@/lib/useLanguages"
import { sanitizeEditorHtml } from "@/lib/sanitize"
import { papersService } from "@/services/papers.service"
import { useCreatePaper, useUpdatePaper } from "@/lib/queries/papers"
import { usePaperCategoriesList } from "@/lib/queries/paper-categories"
import RichTextEditor from "@/components/ui/RichTextEditor"
import TranslationTabs, { pickTranslationsOrEmpty } from "@/components/forms/TranslationTabs"
import { Loader2, Plus, Trash2, UploadCloud } from "lucide-react"
import { FormSelect } from "@/components/ui/Select"

// Server limits (worker/src/features/academic-papers/schemas.ts) — inputs mirror
// them, counted in UTF-16 code units like an HTML maxlength.
const TITLE_MAX = 500
// The abstract is capped at 5000 characters of the STORED string; for the rich
// editor that is HTML, so markup counts toward it.
const ABSTRACT_MAX = 5000
const AUTHOR_MAX = 300
const KEYWORD_MAX = 200
const LIST_MAX = 50
const CODE_MAX = 64

/** "" / unset → undefined, else a number: valueAsNumber would give NaN for an empty box, which zod rejects silently. */
const optionalNumber = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : Number(v))

const translationSchema = z.object({
	lang: z.string().min(2),
	title: z.string().min(1, "العنوان مطلوب").max(TITLE_MAX, `العنوان أطول من ${TITLE_MAX} حرفاً`),
	abstract: z.string()
		.optional()
		.refine((s) => !s || s.length <= ABSTRACT_MAX, {
			message: `الملخص أطول من ${ABSTRACT_MAX} حرف (يُحسب مع تنسيق النص). اختصره أو بسّط التنسيق.`,
		}),
	authors: z.array(z.string().max(AUTHOR_MAX)).max(LIST_MAX, `الحد الأقصى ${LIST_MAX} مؤلفاً`),
	keywords: z.array(z.string().max(KEYWORD_MAX)).max(LIST_MAX, `الحد الأقصى ${LIST_MAX} كلمة مفتاحية`),
	publication_venue: z.string().max(TITLE_MAX, `الحد الأقصى ${TITLE_MAX} حرفاً`).optional(),
	page_count: z.number().int("عدد صحيح").min(1, "عدد الصفحات 1 أو أكثر").optional(),
	is_default: z.boolean(),
})

const paperFormSchema = z.object({
	category_id: z.string().min(1, "التصنيف مطلوب"),
	published_year: z.string().max(CODE_MAX, `الحد الأقصى ${CODE_MAX} حرفاً`).optional(),
	pdf_url: z.string()
		.max(2000, "الرابط طويل جداً (الحد الأقصى 2000)")
		.refine((s) => !s || /^https?:\/\/.+/i.test(s), {
			message: "يجب أن يبدأ الرابط بـ http:// أو https://",
		})
		.optional(),
	document_languages: z.array(z.string()),
	is_published: z.boolean(),
	translations: z.array(translationSchema).min(1),
})

type PaperFormData = z.infer<typeof paperFormSchema>

export default function PaperForm({ paper }: { paper?: AcademicPaper }) {
	const router = useRouter()
	const { languages } = useActiveLanguages()
	const createPaper = useCreatePaper()
	const updatePaper = useUpdatePaper()
	const isSaving = createPaper.isPending || updatePaper.isPending
	const categoriesQuery = usePaperCategoriesList({ limit: 100 })
	const categories = categoriesQuery.data?.items ?? []
	const loadingCats = categoriesQuery.isLoading
	const [activeLang, setActiveLang] = useState("ar")
	const [newAuthor, setNewAuthor] = useState("")
	const [newKeyword, setNewKeyword] = useState("")

	// Upload state — paper PDF
	const pdfFileRef = useRef<HTMLInputElement>(null)
	const [pdfFileName, setPdfFileName] = useState<string | null>(null)
	const [uploadingPdf, setUploadingPdf] = useState(false)

	type PaperTranslationField = PaperFormData["translations"][number]
	const blankTranslation = (lang = "ar", is_default = true): PaperTranslationField => ({
		lang,
		title: "",
		abstract: "",
		authors: [],
		keywords: [],
		publication_venue: "",
		page_count: undefined,
		is_default,
	})

	// API returns `academic_paper_translations` per the OpenAPI spec; if empty, fall back
	// to the resolved `translation` (singular) so editors at least see what's there.
	const buildDefaults = (): PaperFormData => {
		if (!paper) {
			return {
				category_id: "",
				published_year: String(new Date().getFullYear()),
				pdf_url: "",
				document_languages: [],
				is_published: true,
				translations: [blankTranslation()],
			}
		}
		const raw = pickTranslationsOrEmpty(
			paper.academic_paper_translations,
			paper.translation,
		)
		const translations = raw.length
			? raw.map((t): PaperTranslationField => ({
				lang: t.lang,
				title: t.title ?? "",
				abstract: t.abstract ?? "",
				authors: t.authors ?? [],
				keywords: t.keywords ?? [],
				publication_venue: t.publication_venue ?? "",
				page_count: t.page_count ?? undefined,
				is_default: t.is_default ?? false,
			}))
			: [blankTranslation()]
		return {
			category_id: paper.category_id ?? "",
			published_year: paper.published_year ?? "",
			pdf_url: paper.pdf_url ?? "",
			document_languages: paper.document_languages ?? [],
			is_published: paper.is_published,
			translations,
		}
	}

	const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } =
		useForm<PaperFormData>({
			resolver: zodResolver(paperFormSchema),
			defaultValues: buildDefaults(),
		})

	// Re-seed form once categories load and paper exists, to ensure inputs are populated
	// even on slow networks where the form mounted before paper arrived.
	useEffect(() => {
		if (paper) reset(buildDefaults())
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [paper?.id])

	const { fields, append, remove } = useFieldArray({ control, name: "translations" })
	const translations = watch("translations")
	const documentLanguages = watch("document_languages")

	useEffect(() => {
		if (categoriesQuery.error) {
			toast.error(getErrorMessage(categoriesQuery.error, "فشل تحميل التصنيفات"))
		}
	}, [categoriesQuery.error])

	useEffect(() => {
		if (paper && translations.length && !translations.some((t) => t.lang === activeLang)) {
			setActiveLang(translations[0].lang)
		}
	}, [paper, translations, activeLang])

	const addTranslation = () => {
		const used = translations.map((t) => t.lang)
		const next = languages.find((l) => !used.includes(l.code))
		if (!next) { toast.error("لا توجد لغات إضافية متاحة"); return }
		append(blankTranslation(next.code, false))
		setActiveLang(next.code)
	}

	const removeTranslation = (index: number) => {
		const removedLang = translations[index]?.lang
		remove(index)
		if (activeLang === removedLang) {
			const remaining = translations.filter((_, i) => i !== index)
			setActiveLang(remaining[0]?.lang ?? "ar")
		}
	}

	const addAuthor = (index: number) => {
		if (!newAuthor.trim()) return
		const curr = translations[index]?.authors || []
		if (curr.length >= LIST_MAX) { toast.error(`الحد الأقصى ${LIST_MAX} مؤلفاً`); return }
		setValue(`translations.${index}.authors`, [...curr, newAuthor.trim()])
		setNewAuthor("")
	}
	const removeAuthor = (i: number, ai: number) =>
		setValue(`translations.${i}.authors`, translations[i]?.authors.filter((_, idx) => idx !== ai))

	const addKeyword = (index: number) => {
		if (!newKeyword.trim()) return
		const curr = translations[index]?.keywords || []
		if (curr.includes(newKeyword.trim())) { toast.error("الكلمة المفتاحية موجودة"); return }
		if (curr.length >= LIST_MAX) { toast.error(`الحد الأقصى ${LIST_MAX} كلمة مفتاحية`); return }
		setValue(`translations.${index}.keywords`, [...curr, newKeyword.trim()])
		setNewKeyword("")
	}
	const removeKeyword = (i: number, ki: number) =>
		setValue(`translations.${i}.keywords`, translations[i]?.keywords.filter((_, idx) => idx !== ki))

	const toggleDocumentLanguage = (code: string) => {
		const current = documentLanguages ?? []
		setValue(
			"document_languages",
			current.includes(code) ? current.filter((c) => c !== code) : [...current, code],
			{ shouldDirty: true },
		)
	}

	const handlePdfFile = async (file: File) => {
		try {
			setUploadingPdf(true)
			const { publicUrl } = await papersService.uploadPdf(file)
			setValue("pdf_url", publicUrl, { shouldValidate: true })
			setPdfFileName(file.name)
			toast.success("تم رفع ملف PDF")
		} catch (e) {
			toast.error(getErrorMessage(e, "فشل رفع ملف PDF"))
		} finally {
			setUploadingPdf(false)
		}
	}

	const onSubmit = async (data: PaperFormData) => {
		const defaults = data.translations.filter((t) => t.is_default).length
		if (defaults !== 1) {
			toast.error("يجب اختيار لغة افتراضية واحدة بالضبط")
			return
		}
		const body = {
			category_id: data.category_id,
			// PATCH semantics: undefined = leave unchanged, null = clear: send null on
			// edit so an emptied year / a wrong PDF link can actually be removed.
			published_year: data.published_year || (paper ? null : undefined),
			pdf_url: data.pdf_url || (paper ? null : undefined),
			// document_languages is NOT NULL on the DB — always send the full
			// array (never null); [] means "no languages set".
			document_languages: data.document_languages,
			is_published: data.is_published,
			translations: data.translations.map((t) => ({
				...t,
				abstract: t.abstract ? sanitizeEditorHtml(t.abstract) : undefined,
				publication_venue: t.publication_venue || undefined,
			})),
		}
		const handlers = {
			onSuccess: () => {
				toast.success(paper ? "تم تحديث البحث" : "تم إنشاء البحث")
				router.push("/dashboard/papers")
				router.refresh()
			},
			onError: (e: unknown) => toast.error(getErrorMessage(e, "فشل حفظ البحث")),
		}
		if (paper) {
			updatePaper.mutate({ id: paper.id, body }, handlers)
		} else {
			createPaper.mutate(body as Parameters<typeof createPaper.mutate>[0], handlers)
		}
	}

	if (loadingCats) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
			<div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 space-y-6">
				<h3 className="text-lg font-medium text-gray-900">المعلومات الأساسية</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">التصنيف *</label>
						<FormSelect control={control} name={"category_id"} className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary">
							<option value="">اختر تصنيفاً</option>
							{categories.map((cat) => (
								<option key={cat.id} value={cat.id}>
									{categoryName(cat.academic_paper_category_translations, cat.translation)}
								</option>
							))}
						</FormSelect>
						{errors.category_id && <p className="mt-1 text-sm text-red-600">{errors.category_id.message}</p>}
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">سنة النشر</label>
						<input type="number" {...register("published_year")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
						{errors.published_year && <p className="mt-1 text-sm text-red-600">{errors.published_year.message}</p>}
					</div>
					<div className="flex items-end">
						<label className="flex items-center gap-2 cursor-pointer">
							<input type="checkbox" {...register("is_published")} className="h-4 w-4 text-primary rounded" />
							<span className="text-sm">منشور — يظهر على الموقع</span>
						</label>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">ملف PDF</label>
						<input
							ref={pdfFileRef}
							type="file"
							accept=".pdf,application/pdf"
							className="hidden"
							onChange={(e) => {
								const f = e.target.files?.[0]
								if (f) handlePdfFile(f)
								e.target.value = ""
							}}
						/>
						<div className="flex flex-wrap items-center gap-2 mb-2">
							<button
								type="button"
								onClick={() => pdfFileRef.current?.click()}
								disabled={uploadingPdf}
								className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{uploadingPdf
									? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.6} />
									: <UploadCloud className="h-3.5 w-3.5" strokeWidth={1.6} />}
								{uploadingPdf ? "جارٍ الرفع…" : "رفع ملف PDF"}
							</button>
							{pdfFileName && !uploadingPdf && (
								<span className="text-xs text-gray-600 truncate max-w-40" dir="ltr">{pdfFileName}</span>
							)}
						</div>
						<input {...register("pdf_url")} dir="ltr" placeholder="أو ألصق رابط PDF مباشرة" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
						<p className="mt-1 text-xs text-gray-500">يُرفع الملف إلى مخزن الملفات، أو ألصق رابطاً مستضافاً مسبقاً.</p>
						{errors.pdf_url && <p className="mt-1 text-sm text-red-600">{errors.pdf_url.message}</p>}
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">لغة ملف الـ PDF</label>
						<div className="flex flex-wrap gap-1.5">
							{languages.map((l) => {
								const checked = (documentLanguages ?? []).includes(l.code)
								return (
									<button
										key={l.code}
										type="button"
										onClick={() => toggleDocumentLanguage(l.code)}
										className={`cursor-pointer px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
											checked
												? "bg-primary text-white border-primary"
												: "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
										}`}
									>
										{languageLabel(l.code, l.native_name)}
									</button>
								)
							})}
						</div>
						<p className="mt-1 text-xs text-gray-500">لغة الملف نفسه — قد تختلف عن لغة بيانات البحث في الترجمات أدناه.</p>
					</div>
				</div>
			</div>

			<TranslationTabs
				fields={fields}
				translations={translations}
				activeLang={activeLang}
				onChangeActiveLang={(l) => setActiveLang(l)}
				onAdd={addTranslation}
				onRemove={removeTranslation}
				title="الترجمات"
				renderTranslation={(index) => (
					<>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">اللغة *</label>
								<FormSelect control={control} name={`translations.${index}.lang`} className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary">
									{languages.map((l) => (
										<option key={l.code} value={l.code}>{languageLabel(l.code, l.native_name)}</option>
									))}
								</FormSelect>
							</div>
							<div className="flex items-end">
								<label className="flex items-center gap-2">
									<input type="checkbox" {...register(`translations.${index}.is_default`)} onChange={(e) => { if (e.target.checked) { fields.forEach((_, i) => setValue(`translations.${i}.is_default`, i === index)) } else { setValue(`translations.${index}.is_default`, false) } }} className="h-4 w-4 text-primary rounded" />
									<span className="text-sm">اللغة الافتراضية</span>
								</label>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">العنوان *</label>
							<input {...register(`translations.${index}.title`)} maxLength={TITLE_MAX} dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
							{errors.translations?.[index]?.title && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.title?.message}</p>}
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">الملخص</label>
							<Controller
								control={control}
								name={`translations.${index}.abstract`}
								render={({ field: f }) => (
									<RichTextEditor
										value={f.value || ""}
										onChange={f.onChange}
										placeholder="ملخص البحث..."
										dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"}
										minHeight={160}
									/>
								)}
							/>
							<p className={`mt-1 text-[11px] ${(translations[index]?.abstract?.length ?? 0) > ABSTRACT_MAX ? "text-red-600" : "text-gray-400"}`}>
								{translations[index]?.abstract?.length ?? 0} / {ABSTRACT_MAX} (يشمل رموز التنسيق)
							</p>
							{errors.translations?.[index]?.abstract && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.abstract?.message}</p>}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">المؤلفون</label>
							<div className="flex gap-2">
								<input value={newAuthor} maxLength={AUTHOR_MAX} onChange={(e) => setNewAuthor(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAuthor(index) } }} placeholder="أضف مؤلفاً، اضغط Enter" className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
								<button type="button" onClick={() => addAuthor(index)} className="px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200"><Plus className="h-4 w-4" /></button>
							</div>
							<div className="mt-2 flex flex-wrap gap-2">
								{translations[index]?.authors?.map((a, ai) => (
									<span key={ai} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
										{a}<button type="button" onClick={() => removeAuthor(index, ai)} className="text-gray-500 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
									</span>
								))}
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">الكلمات المفتاحية</label>
							<div className="flex gap-2">
								<input value={newKeyword} maxLength={KEYWORD_MAX} onChange={(e) => setNewKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(index) } }} placeholder="أضف كلمة مفتاحية، اضغط Enter" className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
								<button type="button" onClick={() => addKeyword(index)} className="px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200"><Plus className="h-4 w-4" /></button>
							</div>
							<div className="mt-2 flex flex-wrap gap-2">
								{translations[index]?.keywords?.map((k, ki) => (
									<span key={ki} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
										{k}<button type="button" onClick={() => removeKeyword(index, ki)} className="text-blue-500 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
									</span>
								))}
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">مكان النشر</label>
								<input {...register(`translations.${index}.publication_venue`)} maxLength={TITLE_MAX} placeholder="مجلة / مؤتمر" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">عدد الصفحات</label>
								<input type="number" min={1} {...register(`translations.${index}.page_count`, { setValueAs: optionalNumber })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
								{errors.translations?.[index]?.page_count && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.page_count?.message}</p>}
							</div>
						</div>
					</>
				)}
			/>

			<div className="flex gap-3">
				<button type="submit" disabled={isSaving || uploadingPdf} className="cursor-pointer inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-semibold rounded-md shadow-soft hover:bg-[hsl(var(--primary)/0.92)] hover:shadow-raise disabled:opacity-50 disabled:cursor-not-allowed transition-all active:translate-y-px">
					{isSaving && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />}
					{isSaving ? "جارٍ الحفظ..." : paper ? "تحديث البحث" : "إنشاء بحث"}
				</button>
				<button type="button" onClick={() => router.push("/dashboard/papers")} disabled={isSaving} className="cursor-pointer px-6 py-2.5 border border-[hsl(var(--border-strong))] font-medium rounded-md text-foreground bg-white hover:bg-surface-muted disabled:opacity-50 transition-colors">إلغاء</button>
			</div>
		</form>
	)
}
