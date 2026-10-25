"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { BookDetail } from "@/types"
import { toast } from "sonner"
import { getErrorMessage, getErrorCode, getErrorStatus, getServerErrorText } from "@/lib/api"
import { categoryName, pickTranslation, slugify } from "@/lib/i18n"
import { editHref } from "@/lib/routes"
import { useActiveLanguages, languageLabel } from "@/lib/useLanguages"
import { sanitizeEditorHtml } from "@/lib/sanitize"
import { booksService } from "@/services/books.service"
import { useBook, useCreateBook, useUpdateBook } from "@/lib/queries/books"
import { useBookCategoriesList } from "@/lib/queries/book-categories"
import RichTextEditor from "@/components/ui/RichTextEditor"
import MediaInput from "@/components/ui/MediaInput"
import TranslationTabs, { pickTranslationsOrEmpty } from "@/components/forms/TranslationTabs"
import ParentBookPicker from "@/components/books/ParentBookPicker"
import { Loader2, UploadCloud, Plus, Pencil } from "lucide-react"
import { FormSelect } from "@/components/ui/Select"

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Server limits (worker/src/features/books/schemas.ts) — inputs mirror them,
// counted in UTF-16 code units like an HTML maxlength.
const TITLE_MAX = 500
const PERSON_MAX = 300
// `description` is capped at 5000 characters of the STORED string, which for
// the rich editor is HTML — markup counts, so a long formatted text can hit it.
const DESCRIPTION_MAX = 5000
const CODE_MAX = 64

/** "" / unset → undefined, else a number: valueAsNumber would give NaN for an empty box. */
const optionalNumber = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : Number(v))

const translationSchema = z.object({
	lang: z.string().min(2),
	title: z.string().min(1, "العنوان مطلوب").max(TITLE_MAX, `العنوان أطول من ${TITLE_MAX} حرفاً`),
	author: z.string().max(PERSON_MAX, `الحد الأقصى ${PERSON_MAX} حرفاً`).optional(),
	publisher: z.string().max(PERSON_MAX, `الحد الأقصى ${PERSON_MAX} حرفاً`).optional(),
	description: z.string()
		.optional()
		.refine((s) => !s || s.length <= DESCRIPTION_MAX, {
			message: `الوصف أطول من ${DESCRIPTION_MAX} حرف (يُحسب مع تنسيق النص). اختصره أو بسّط التنسيق.`,
		}),
	series: z.string().max(TITLE_MAX, `الحد الأقصى ${TITLE_MAX} حرفاً`).optional(),
	meta_title: z.string().max(300).optional(),
	meta_description: z.string().max(500).optional(),
	og_image_id: z.string().nullable().optional(),
	is_default: z.boolean(),
})

const bookFormSchema = z.object({
	category_id: z.string().min(1, "التصنيف مطلوب"),
	cover_image_id: z.string().min(1, "صورة الغلاف مطلوبة"),
	slug: z.string()
		.max(200, "الرابط المختصر طويل جداً (الحد الأقصى 200)")
		.refine((s) => !s || SLUG_RE.test(s), {
			message: "الرابط المختصر: أحرف لاتينية صغيرة وأرقام وشرطات فقط (مثل: al-sahifa)",
		})
		.optional(),
	isbn: z.string().max(CODE_MAX, `الحد الأقصى ${CODE_MAX} حرفاً`).optional(),
	pages: z.number().int("عدد صحيح").min(1, "عدد الصفحات 1 أو أكثر").optional(),
	publish_year: z.string().max(CODE_MAX, `الحد الأقصى ${CODE_MAX} حرفاً`).optional(),
	pdf_url: z.string()
		.max(2000, "الرابط طويل جداً (الحد الأقصى 2000)")
		.refine((s) => !s || /^https?:\/\/.+/i.test(s), {
			message: "يجب أن يبدأ الرابط بـ http:// أو https://",
		})
		.optional(),
	document_languages: z.array(z.string()),
	// Series: this book is volume `part_number` of `parts` in the series `parent_id`.
	parent_id: z.string().nullable().optional(),
	part_number: z.number().int("عدد صحيح").min(1, "رقم الجزء 1 أو أكثر").optional(),
	parts: z.number().int("عدد صحيح").min(1, "إجمالي الأجزاء 1 أو أكثر").optional(),
	is_publication: z.boolean(),
	is_published: z.boolean(),
	translations: z.array(translationSchema).min(1),
})

type BookFormData = z.infer<typeof bookFormSchema>

export default function BookForm({ book }: { book?: BookDetail }) {
	const router = useRouter()
	// «إضافة جزء» on a series page opens /books/new?parent_id=… — prefill from that series.
	const presetParentId = useSearchParams().get("parent_id")
	const presetParent = useBook(!book ? presetParentId ?? undefined : undefined)
	const prefilled = useRef(false)
	const { languages } = useActiveLanguages()
	const createBook = useCreateBook()
	const updateBook = useUpdateBook()
	const isSaving = createBook.isPending || updateBook.isPending
	const categoriesQuery = useBookCategoriesList({ limit: 100 })
	const categories = categoriesQuery.data?.items ?? []
	const loadingCats = categoriesQuery.isLoading
	const [activeLang, setActiveLang] = useState("ar")

	// Upload state — book PDF
	const pdfFileRef = useRef<HTMLInputElement>(null)
	const [pdfFileName, setPdfFileName] = useState<string | null>(null)
	const [uploadingPdf, setUploadingPdf] = useState(false)

	const blankTranslation = (lang = "ar", is_default = true) => ({
		lang,
		title: "",
		author: "",
		publisher: "",
		description: "",
		series: "",
		meta_title: "",
		meta_description: "",
		og_image_id: null,
		is_default,
	})

	const buildDefaults = (): BookFormData => {
		if (!book) {
			return {
				category_id: "",
				cover_image_id: "",
				slug: "",
				publish_year: String(new Date().getFullYear()),
				pdf_url: "",
				document_languages: [],
				parent_id: presetParentId,
				is_publication: false,
				is_published: true,
				translations: [blankTranslation()],
			}
		}
		const raw = pickTranslationsOrEmpty(book.book_translations, book.translation)
		const translations = raw.length
			? raw.map((t) => ({
				lang: t.lang,
				title: t.title ?? "",
				author: t.author ?? "",
				publisher: t.publisher ?? "",
				description: t.description ?? "",
				series: t.series ?? "",
				meta_title: t.meta_title ?? "",
				meta_description: t.meta_description ?? "",
				og_image_id: t.og_image_id ?? null,
				is_default: t.is_default ?? false,
			}))
			: [blankTranslation()]
		return {
			category_id: book.category_id ?? "",
			cover_image_id: book.cover_image_id ?? "",
			slug: book.slug ?? "",
			isbn: book.isbn ?? "",
			pages: book.pages ?? undefined,
			publish_year: book.publish_year ?? "",
			pdf_url: book.pdf_url ?? "",
			document_languages: book.document_languages ?? [],
			parent_id: book.parent?.id ?? null,
			part_number: book.part_number ?? undefined,
			// The series total is write-only (no read response carries it): leave it
			// empty and send it only if the editor types one.
			parts: undefined,
			is_publication: book.is_publication ?? false,
			is_published: book.is_published,
			translations,
		}
	}

	const { register, handleSubmit, control, watch, setValue, setError, reset, formState: { errors } } =
		useForm<BookFormData>({
			resolver: zodResolver(bookFormSchema),
			defaultValues: buildDefaults(),
		})

	useEffect(() => {
		if (book) reset(buildDefaults())
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [book?.id])

	const { fields, append, remove } = useFieldArray({ control, name: "translations" })
	const translations = watch("translations")
	const documentLanguages = watch("document_languages")
	const parentId = watch("parent_id") ?? null
	const isPublishedNow = watch("is_published")
	// A series PARENT is the cover entry for its volumes: no PDF or part number of its own.
	const isSeriesParent = (book?.parts_count ?? 0) > 0
	// A live book's slug is its public URL: the API refuses to rename it while it
	// is (and stays) published — but only once it HAS one. Unpublishing in the same save unlocks it.
	const slugLocked = !!book?.is_published && !!book?.slug && isPublishedNow

	// New volume of an existing series: start from the series' own data so the
	// editor only fills in what differs (volume number, PDF, pages).
	useEffect(() => {
		const parent = presetParent.data
		if (book || !parent || prefilled.current) return
		prefilled.current = true
		const defaults = buildDefaults()
		const volumes = parent.parts ?? []
		const nextNumber = volumes.reduce((m, p) => Math.max(m, p.part_number ?? 0), 0) + 1
		const raw = pickTranslationsOrEmpty(parent.book_translations, parent.translation)
		reset({
			...defaults,
			category_id: parent.category_id,
			cover_image_id: parent.cover_image_id,
			publish_year: parent.publish_year ?? defaults.publish_year,
			document_languages: parent.document_languages ?? [],
			parent_id: parent.id,
			part_number: nextNumber,
			parts: Math.max(volumes.length + 1, nextNumber),
			is_publication: parent.is_publication ?? false,
			is_published: parent.is_published,
			translations: raw.length
				? raw.map((t) => ({
					...blankTranslation(t.lang, t.is_default ?? false),
					title: t.title ?? "",
					author: t.author ?? "",
					publisher: t.publisher ?? "",
					series: t.series ?? "",
				}))
				: defaults.translations,
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [presetParent.data, book])

	useEffect(() => {
		if (categoriesQuery.error) {
			toast.error(getErrorMessage(categoriesQuery.error, "فشل تحميل التصنيفات"))
		}
	}, [categoriesQuery.error])

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
			const { publicUrl } = await booksService.uploadPdf(file)
			setValue("pdf_url", publicUrl, { shouldValidate: true })
			setPdfFileName(file.name)
			toast.success("تم رفع ملف PDF")
		} catch (e) {
			toast.error(getErrorMessage(e, "فشل رفع ملف PDF"))
		} finally {
			setUploadingPdf(false)
		}
	}

	const onSubmit = async (data: BookFormData) => {
		const defaults = data.translations.filter((t) => t.is_default).length
		if (defaults !== 1) {
			toast.error("يجب اختيار لغة افتراضية واحدة بالضبط")
			return
		}
		// part_number and parts are written as a pair. A NEW volume needs both; an
		// existing one already has its total stored (it is never sent back), so one
		// alone is fine there. Emptying part_number takes the book out of numbering.
		const storedNumbered = book?.part_number != null
		if (data.part_number != null && data.parts == null && !storedNumbered) {
			setError("parts", { type: "validate", message: "أدخل إجمالي الأجزاء مع رقم الجزء" })
			return
		}
		if (data.parts != null && data.part_number == null) {
			setError("part_number", { type: "validate", message: "أدخل رقم الجزء مع إجمالي الأجزاء" })
			return
		}
		if (data.part_number != null && data.parts != null && data.part_number > data.parts) {
			setError("part_number", { type: "validate", message: "رقم الجزء أكبر من إجمالي الأجزاء" })
			return
		}
		const clearNumbering = !!book && storedNumbered && data.part_number == null
		const initialParentId = book?.parent?.id ?? null
		const body = {
			category_id: data.category_id,
			cover_image_id: data.cover_image_id,
			// PATCH semantics: undefined = leave unchanged, null = clear.
			slug: data.slug || (book ? null : undefined),
			isbn: data.isbn || (book ? null : undefined),
			pages: data.pages ?? (book ? null : undefined),
			publish_year: data.publish_year || (book ? null : undefined),
			// PATCH semantics: undefined = leave unchanged, null = clear. Send
			// null on edit so an editor can actually remove a wrong PDF link.
			pdf_url: data.pdf_url || (book ? null : undefined),
			// document_languages is NOT NULL on the DB — always send the full
			// array (never null); [] means "no languages set".
			document_languages: data.document_languages,
			...(clearNumbering
				? { part_number: null, parts: null }
				: { part_number: data.part_number, parts: data.parts }),
			// Send the series link only when it is being set/changed; null detaches.
			...(book
				? (data.parent_id ?? null) !== initialParentId ? { parent_id: data.parent_id ?? null } : {}
				: data.parent_id ? { parent_id: data.parent_id } : {}),
			is_publication: data.is_publication,
			is_published: data.is_published,
			translations: data.translations.map((t) => ({
				...t,
				author: t.author || undefined,
				publisher: t.publisher || undefined,
				description: t.description ? sanitizeEditorHtml(t.description) : undefined,
				series: t.series || undefined,
				meta_title: t.meta_title || undefined,
				meta_description: t.meta_description || undefined,
				og_image_id: t.og_image_id ?? null,
			})),
		}
		const handlers = {
			onSuccess: () => {
				toast.success(book ? "تم تحديث الكتاب" : "تم إنشاء الكتاب")
				router.push("/dashboard/books")
				router.refresh()
			},
			onError: (e: unknown) => {
				if (getErrorStatus(e) === 409) {
					const text = getServerErrorText(e) ?? ""
					if (getErrorCode(e) === "SLUG_LOCKED_WHILE_PUBLISHED" || /\bslug\b/i.test(text)) {
						setError("slug", { type: "server", message: getErrorMessage(e, "الرابط المختصر مستخدم بالفعل") })
						return
					}
					if (/isbn/i.test(text)) {
						setError("isbn", { type: "server", message: "يوجد كتاب آخر بهذا الرقم الدولي (ISBN)." })
						return
					}
					if (/part number/i.test(text)) {
						setError("part_number", { type: "server", message: "رقم الجزء مستخدم لجزء آخر من السلسلة نفسها." })
						return
					}
				}
				toast.error(getErrorMessage(e, "فشل حفظ الكتاب"))
			},
		}
		if (book) {
			updateBook.mutate({ id: book.id, body }, handlers)
		} else {
			createBook.mutate(body as Parameters<typeof createBook.mutate>[0], handlers)
		}
	}

	if (loadingCats) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<div className="lg:col-span-2 space-y-6">
				<TranslationTabs
					fields={fields}
					translations={translations}
					activeLang={activeLang}
					onChangeActiveLang={(l) => setActiveLang(l)}
					onAdd={addTranslation}
					onRemove={removeTranslation}
					title="بيانات الكتاب"
					renderTranslation={(index) => (
						<>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								<div>
									<label className="block text-xs font-medium text-gray-500 mb-1">اللغة</label>
									<FormSelect control={control} name={`translations.${index}.lang`} className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm">
										{languages.map((l) => (
											<option key={l.code} value={l.code}>{languageLabel(l.code, l.native_name)}</option>
										))}
									</FormSelect>
								</div>
								<div className="md:col-span-2 flex items-end">
									<label className="flex items-center gap-2">
										<input type="checkbox" {...register(`translations.${index}.is_default`)} onChange={(e) => { if (e.target.checked) { fields.forEach((_, i) => setValue(`translations.${i}.is_default`, i === index)) } else { setValue(`translations.${index}.is_default`, false) } }} className="h-4 w-4 text-primary rounded" />
										<span className="text-sm">اللغة الافتراضية</span>
									</label>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">العنوان *</label>
								<input {...register(`translations.${index}.title`)} maxLength={TITLE_MAX} dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-lg" />
								{errors.translations?.[index]?.title && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.title?.message}</p>}
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">المؤلف</label>
									<input {...register(`translations.${index}.author`)} maxLength={PERSON_MAX} dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">الناشر</label>
									<input {...register(`translations.${index}.publisher`)} maxLength={PERSON_MAX} dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">السلسلة</label>
									<input {...register(`translations.${index}.series`)} maxLength={TITLE_MAX} dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
								<Controller
									control={control}
									name={`translations.${index}.description`}
									render={({ field: f }) => (
										<RichTextEditor
											value={f.value || ""}
											onChange={f.onChange}
											placeholder="نبذة عن الكتاب..."
											dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"}
											minHeight={200}
										/>
									)}
								/>
								<p className={`mt-1 text-[11px] ${(translations[index]?.description?.length ?? 0) > DESCRIPTION_MAX ? "text-red-600" : "text-gray-400"}`}>
									{translations[index]?.description?.length ?? 0} / {DESCRIPTION_MAX} (يشمل رموز التنسيق)
								</p>
								{errors.translations?.[index]?.description && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.description?.message}</p>}
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
											placeholder="إن تُرك فارغاً، يُستخدم مقطع من الوصف"
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
										<p className="mt-1.5 text-xs text-gray-600">تظهر عند مشاركة الكتاب في فيسبوك / تويتر. إن تُركت فارغة، تُستخدم صورة الغلاف.</p>
									</div>
								</div>
							</details>
						</>
					)}
				/>
			</div>

			<aside className="space-y-6">
				<div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5 space-y-4">
					<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">التصنيف</h3>
					<FormSelect control={control} name={"category_id"} className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm">
						<option value="">اختر تصنيفاً</option>
						{categories.map((cat) => (
							<option key={cat.id} value={cat.id}>
								{categoryName(cat.book_category_translations, cat.translation)}
							</option>
						))}
					</FormSelect>
					{errors.category_id && <p className="text-sm text-red-600">{errors.category_id.message}</p>}
				</div>

				<div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5">
					<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
						صورة الغلاف <span className="text-red-500">*</span>
					</h3>
					<Controller
						control={control}
						name="cover_image_id"
						render={({ field: f }) => (
							<MediaInput value={f.value || undefined} onChange={(v) => f.onChange(v ?? "")} />
						)}
					/>
					{errors.cover_image_id && <p className="mt-2 text-sm text-red-600">{errors.cover_image_id.message}</p>}
				</div>

				<div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5 space-y-4">
					<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">النشر والرابط</h3>
					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">الرابط المختصر (اختياري)</label>
						<div className="flex gap-2">
							{/* readOnly, not disabled: react-hook-form drops a disabled input's value. */}
							<input {...register("slug")} dir="ltr" maxLength={200} readOnly={slugLocked} placeholder="al-sahifa-al-sajjadiyya" className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary font-mono text-xs read-only:bg-gray-50 read-only:text-gray-500 read-only:cursor-not-allowed" />
							<button
								type="button"
								disabled={slugLocked}
								onClick={() => {
									const def = translations.find((t) => t.is_default) || translations[0]
									setValue("slug", slugify(def?.title || ""), { shouldDirty: true })
								}}
								className="cursor-pointer px-3 py-2 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
							>
								توليد من العنوان
							</button>
						</div>
						{slugLocked ? (
							<p className="mt-1 text-[11px] text-amber-700">الرابط ثابت لأن الكتاب منشور (رابطه العام قد شاركه الناس). ألغِ النشر أولاً إن كان لا بد من تغييره.</p>
						) : (
							<p className="mt-1 text-[11px] text-gray-400">رابط واحد لكل كتاب لجميع اللغات. اتركه فارغاً للوصول بالمعرّف فقط.</p>
						)}
						{errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>}
					</div>
					<label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-gray-200">
						<input type="checkbox" {...register("is_published")} className="h-4 w-4 text-primary rounded" />
						<span className="text-sm">منشور — يظهر على الموقع</span>
					</label>
					<label className="flex items-start gap-2 cursor-pointer">
						<input type="checkbox" {...register("is_publication")} className="h-4 w-4 text-primary rounded mt-0.5" />
						<span className="text-sm">
							من إصدارات المؤسسة
							<span className="block text-[11px] text-gray-500">يظهر ضمن قائمة «الإصدارات» بغض النظر عن تصنيفه الموضوعي.</span>
						</span>
					</label>
				</div>

				{/* Multi-part series. A series is a cover entry plus one book per volume. */}
				{isSeriesParent && book ? (
					<div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5 space-y-3">
						<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">أجزاء السلسلة ({book.parts_count})</h3>
						<p className="text-[11px] text-gray-500 leading-relaxed">هذا الكتاب هو واجهة السلسلة (الغلاف والعنوان). لكل جزء ملف PDF وغلافه الخاص، ولا تظهر الأجزاء في قائمة الكتب بل داخل السلسلة.</p>
						<ul className="divide-y divide-gray-100 border border-gray-100 rounded-md">
							{(book.parts ?? []).map((p) => (
								<li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
									<span className="truncate">
										<span className="text-gray-500 ml-1">الجزء {p.part_number ?? "—"}</span>
										{p.pdf_url ? <span className="text-[11px] text-primary">PDF</span> : <span className="text-[11px] text-amber-600">بلا PDF</span>}
									</span>
									<Link href={editHref.book(p.id)} className="shrink-0 inline-flex items-center gap-1 text-xs text-primary hover:underline"><Pencil className="h-3 w-3" />تعديل</Link>
								</li>
							))}
						</ul>
						<Link href={`/dashboard/books/new?parent_id=${encodeURIComponent(book.id)}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-primary text-primary rounded-md hover:bg-primary/5">
							<Plus className="h-3.5 w-3.5" />إضافة جزء جديد
						</Link>
					</div>
				) : (
					<div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5 space-y-3">
						<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">سلسلة الأجزاء</h3>
						<p className="text-[11px] text-gray-500 leading-relaxed">اترك هذا الحقل فارغاً لكتاب مستقل. لإنشاء سلسلة: أنشئ أولاً كتاباً بعنوان السلسلة وغلافها (بلا PDF)، ثم أضف كل جزء واختر هذه السلسلة هنا.</p>
						<ParentBookPicker
							value={parentId}
							onChange={(id) => setValue("parent_id", id, { shouldDirty: true })}
							excludeId={book?.id}
						/>
						{book?.parent && (
							<Link href={editHref.book(book.parent.id)} className="inline-block text-xs text-primary hover:underline">
								فتح السلسلة: {pickTranslation(book.parent.book_translations, book.parent.translation)?.title || "السلسلة"}
							</Link>
						)}
						{parentId && (
							<div className="grid grid-cols-2 gap-3 pt-1">
								<div>
									<label className="block text-xs font-medium text-gray-500 mb-1">رقم الجزء *</label>
									<input type="number" min={1} {...register("part_number", { setValueAs: optionalNumber })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
									{errors.part_number && <p className="mt-1 text-xs text-red-600">{errors.part_number.message}</p>}
								</div>
								<div>
									<label className="block text-xs font-medium text-gray-500 mb-1">إجمالي الأجزاء</label>
									<input type="number" min={1} {...register("parts", { setValueAs: optionalNumber })} placeholder={book ? "لم يتغيّر" : ""} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
									{errors.parts && <p className="mt-1 text-xs text-red-600">{errors.parts.message}</p>}
								</div>
							</div>
						)}
					</div>
				)}

				<div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5 space-y-3">
					<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">تفاصيل النشر</h3>
					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">ISBN</label>
						<input {...register("isbn")} dir="ltr" maxLength={CODE_MAX} placeholder="978-3-16-148410-0" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
						{errors.isbn && <p className="mt-1 text-xs text-red-600">{errors.isbn.message}</p>}
					</div>
					{!isSeriesParent && (
					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">ملف PDF</label>
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
						<input {...register("pdf_url")} dir="ltr" placeholder="أو ألصق رابط PDF مباشرة" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
						<p className="mt-1 text-[11px] text-gray-500">يُرفع الملف إلى مخزن الملفات، أو ألصق رابطاً مستضافاً مسبقاً.</p>
						{errors.pdf_url && <p className="mt-1 text-sm text-red-600">{errors.pdf_url.message}</p>}
					</div>
					)}
					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">لغة ملف الـ PDF</label>
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
						<p className="mt-1 text-[11px] text-gray-500">لغة الملف نفسه — قد تختلف عن لغة بيانات الكتاب في الترجمات أعلاه.</p>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block text-xs font-medium text-gray-500 mb-1">سنة النشر</label>
							<input type="number" {...register("publish_year")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
						</div>
						<div>
							<label className="block text-xs font-medium text-gray-500 mb-1">عدد الصفحات</label>
							<input type="number" min={1} {...register("pages", { setValueAs: optionalNumber })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
							{errors.pages && <p className="mt-1 text-xs text-red-600">{errors.pages.message}</p>}
						</div>
					</div>
				</div>

				<div className="flex flex-col gap-2">
					<button type="submit" disabled={isSaving || uploadingPdf} className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white font-semibold rounded-md shadow-soft hover:bg-[hsl(var(--primary)/0.92)] hover:shadow-raise disabled:opacity-50 disabled:cursor-not-allowed transition-all active:translate-y-px">
						{isSaving && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />}
						{book ? "تحديث الكتاب" : "إنشاء كتاب"}
					</button>
					<button type="button" onClick={() => router.push("/dashboard/books")} disabled={isSaving} className="cursor-pointer w-full px-6 py-2.5 border border-[hsl(var(--border-strong))] font-medium rounded-md text-foreground bg-white hover:bg-surface-muted disabled:opacity-50 transition-colors">إلغاء</button>
				</div>
			</aside>
		</form>
	)
}
