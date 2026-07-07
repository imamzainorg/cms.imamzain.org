"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { AcademicPaper } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { categoryName, slugify } from "@/lib/i18n"
import { useActiveLanguages, languageLabel } from "@/lib/useLanguages"
import { byteLength, sanitizeEditorHtml, MAX_BODY_BYTES } from "@/lib/sanitize"
import { useCreatePaper, useUpdatePaper } from "@/lib/queries/papers"
import { usePaperCategoriesList } from "@/lib/queries/paper-categories"
import RichTextEditor from "@/components/ui/RichTextEditor"
import MediaInput from "@/components/ui/MediaInput"
import TranslationTabs, { pickTranslationsOrEmpty } from "@/components/forms/TranslationTabs"
import { Loader2, Plus, Trash2 } from "lucide-react"

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const translationSchema = z.object({
	lang: z.string().min(2),
	title: z.string().min(1, "العنوان مطلوب"),
	abstract: z.string()
		.optional()
		.refine((s) => !s || byteLength(s) <= MAX_BODY_BYTES, {
			message: `الملخص كبير جداً (الحد الأقصى ${Math.round(MAX_BODY_BYTES / 1024)} ك.ب).`,
		}),
	authors: z.array(z.string()),
	keywords: z.array(z.string()),
	publication_venue: z.string().optional(),
	page_count: z.number().optional(),
	slug: z.string()
		.max(200, "الرابط المختصر طويل جداً (الحد الأقصى 200)")
		.refine((s) => !s || SLUG_RE.test(s), {
			message: "الرابط المختصر: أحرف لاتينية صغيرة وأرقام وشرطات فقط (مثل: fiqh-al-imam)",
		})
		.optional(),
	meta_title: z.string().max(300).optional(),
	meta_description: z.string().max(500).optional(),
	og_image_id: z.string().nullable().optional(),
	is_default: z.boolean(),
})

const paperFormSchema = z.object({
	category_id: z.string().min(1, "التصنيف مطلوب"),
	published_year: z.string().optional(),
	pdf_url: z.string()
		.refine((s) => !s || /^https?:\/\/.+/i.test(s), {
			message: "يجب أن يبدأ الرابط بـ http:// أو https://",
		})
		.optional(),
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

	type PaperTranslationField = PaperFormData["translations"][number]
	const blankTranslation = (lang = "ar", is_default = true): PaperTranslationField => ({
		lang,
		title: "",
		abstract: "",
		authors: [],
		keywords: [],
		publication_venue: "",
		page_count: undefined,
		slug: "",
		meta_title: "",
		meta_description: "",
		og_image_id: null,
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
				slug: t.slug ?? "",
				meta_title: t.meta_title ?? "",
				meta_description: t.meta_description ?? "",
				og_image_id: t.og_image_id ?? null,
				is_default: t.is_default ?? false,
			}))
			: [blankTranslation()]
		return {
			category_id: paper.category_id ?? "",
			published_year: paper.published_year ?? "",
			pdf_url: paper.pdf_url ?? "",
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
		setValue(`translations.${index}.authors`, [...(translations[index]?.authors || []), newAuthor.trim()])
		setNewAuthor("")
	}
	const removeAuthor = (i: number, ai: number) =>
		setValue(`translations.${i}.authors`, translations[i]?.authors.filter((_, idx) => idx !== ai))

	const addKeyword = (index: number) => {
		if (!newKeyword.trim()) return
		const curr = translations[index]?.keywords || []
		if (curr.includes(newKeyword.trim())) { toast.error("الكلمة المفتاحية موجودة"); return }
		setValue(`translations.${index}.keywords`, [...curr, newKeyword.trim()])
		setNewKeyword("")
	}
	const removeKeyword = (i: number, ki: number) =>
		setValue(`translations.${i}.keywords`, translations[i]?.keywords.filter((_, idx) => idx !== ki))

	const onSubmit = async (data: PaperFormData) => {
		const defaults = data.translations.filter((t) => t.is_default).length
		if (defaults !== 1) {
			toast.error("يجب اختيار لغة افتراضية واحدة بالضبط")
			return
		}
		const cleaned = {
			...data,
			// PATCH semantics: undefined = leave unchanged, null = clear. Send
			// null on edit so an editor can remove a wrong PDF link.
			pdf_url: data.pdf_url || (paper ? null : undefined),
			published_year: data.published_year || undefined,
			translations: data.translations.map((t) => ({
				...t,
				abstract: t.abstract ? sanitizeEditorHtml(t.abstract) : undefined,
				publication_venue: t.publication_venue || undefined,
				slug: t.slug || undefined,
				meta_title: t.meta_title || undefined,
				meta_description: t.meta_description || undefined,
				og_image_id: t.og_image_id ?? null,
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
			updatePaper.mutate({ id: paper.id, body: cleaned }, handlers)
		} else {
			createPaper.mutate(cleaned as Parameters<typeof createPaper.mutate>[0], handlers)
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
						<select {...register("category_id")} className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary">
							<option value="">اختر تصنيفاً</option>
							{categories.map((cat) => (
								<option key={cat.id} value={cat.id}>
									{categoryName(cat.academic_paper_category_translations, cat.translation)}
								</option>
							))}
						</select>
						{errors.category_id && <p className="mt-1 text-sm text-red-600">{errors.category_id.message}</p>}
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">سنة النشر</label>
						<input type="number" {...register("published_year")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">رابط ملف PDF</label>
						<input {...register("pdf_url")} dir="ltr" placeholder="https://example.org/paper.pdf" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
						<p className="mt-1 text-xs text-gray-500">يُستضاف ملف PDF خارجيًا — ألصق الرابط المباشر.</p>
						{errors.pdf_url && <p className="mt-1 text-sm text-red-600">{errors.pdf_url.message}</p>}
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
								<select {...register(`translations.${index}.lang`)} className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary">
									{languages.map((l) => (
										<option key={l.code} value={l.code}>{languageLabel(l.code, l.native_name)}</option>
									))}
								</select>
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
							<input {...register(`translations.${index}.title`)} dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
							{errors.translations?.[index]?.title && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.title?.message}</p>}
						</div>

						<details className="text-sm">
							<summary className="text-gray-500 cursor-pointer hover:text-gray-700 select-none">الرابط المختصر (slug)</summary>
							<div className="mt-1 flex gap-2">
								<input {...register(`translations.${index}.slug`)} dir="ltr" placeholder="fiqh-al-imam-sajjad" className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary font-mono text-xs" />
								<button
									type="button"
									onClick={() => setValue(`translations.${index}.slug`, slugify(translations[index]?.title || ""), { shouldDirty: true })}
									className="cursor-pointer px-3 py-2 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 whitespace-nowrap"
								>
									توليد من العنوان
								</button>
							</div>
							<p className="mt-1 text-xs text-gray-400">اختياري — أحرف لاتينية صغيرة وأرقام وشرطات فقط. يحدّد رابط البحث العام لهذه اللغة؛ اتركه فارغاً ليبقى الوصول عبر المعرّف فقط.</p>
							{errors.translations?.[index]?.slug && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.slug?.message}</p>}
						</details>

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
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">المؤلفون</label>
							<div className="flex gap-2">
								<input value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAuthor(index) } }} placeholder="أضف مؤلفاً، اضغط Enter" className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
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
								<input value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(index) } }} placeholder="أضف كلمة مفتاحية، اضغط Enter" className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
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
								<input {...register(`translations.${index}.publication_venue`)} placeholder="مجلة / مؤتمر" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">عدد الصفحات</label>
								<input type="number" {...register(`translations.${index}.page_count`, { valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
							</div>
						</div>

						{/* SEO panel — per-translation override of OG/meta tags. */}
						<details className="bg-white border border-gray-200 rounded-lg overflow-hidden">
							<summary className="cursor-pointer text-sm font-semibold text-gray-900 select-none px-4 py-3 bg-linear-to-l from-primary/5 to-transparent border-b border-gray-100 flex items-center gap-2">
								<span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs font-medium">SEO</span>
								إعدادات تحسين محركات البحث ({languageLabel(translations[index]?.lang)})
							</summary>
							<div className="p-5 space-y-5 bg-white">
								<div>
									<label className="block text-sm font-medium text-gray-800 mb-1.5">عنوان SEO (meta title)</label>
									<input
										{...register(`translations.${index}.meta_title`)}
										dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"}
										placeholder="إن تُرك فارغاً، يُستخدم العنوان الأصلي"
										className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-base text-gray-900 bg-white placeholder:text-gray-400"
									/>
									<p className="mt-1.5 text-xs text-gray-600">يظهر في وسم &lt;title&gt; وفي عنوان نتيجة البحث. اتركه فارغاً للاستعمال التلقائي.</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-800 mb-1.5">وصف SEO (meta description)</label>
									<textarea
										{...register(`translations.${index}.meta_description`)}
										rows={3}
										dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"}
										placeholder="إن تُرك فارغاً، يُستخدم مقطع من الملخص"
										className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-base text-gray-900 bg-white placeholder:text-gray-400"
									/>
									<p className="mt-1.5 text-xs text-gray-600">يظهر تحت العنوان في نتائج البحث. الحد الأمثل 150–160 حرفاً.</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-800 mb-1.5">صورة المشاركة (og:image)</label>
									<Controller
										control={control}
										name={`translations.${index}.og_image_id`}
										render={({ field: f }) => (
											<MediaInput
												value={f.value ?? undefined}
												onChange={f.onChange}
											/>
										)}
									/>
									<p className="mt-1.5 text-xs text-gray-600">تظهر عند مشاركة البحث في فيسبوك / تويتر.</p>
								</div>
							</div>
						</details>
					</>
				)}
			/>

			<div className="flex gap-3">
				<button type="submit" disabled={isSaving} className="cursor-pointer inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-semibold rounded-md shadow-soft hover:bg-[hsl(var(--primary)/0.92)] hover:shadow-raise disabled:opacity-50 disabled:cursor-not-allowed transition-all active:translate-y-px">
					{isSaving && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />}
					{isSaving ? "جارٍ الحفظ..." : paper ? "تحديث البحث" : "إنشاء بحث"}
				</button>
				<button type="button" onClick={() => router.push("/dashboard/papers")} disabled={isSaving} className="cursor-pointer px-6 py-2.5 border border-[hsl(var(--border-strong))] font-medium rounded-md text-foreground bg-white hover:bg-surface-muted disabled:opacity-50 transition-colors">إلغاء</button>
			</div>
		</form>
	)
}
