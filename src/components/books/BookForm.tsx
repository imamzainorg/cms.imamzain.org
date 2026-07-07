"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Book } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { categoryName, slugify } from "@/lib/i18n"
import { useActiveLanguages, languageLabel } from "@/lib/useLanguages"
import { byteLength, sanitizeEditorHtml, MAX_BODY_BYTES } from "@/lib/sanitize"
import { useCreateBook, useUpdateBook } from "@/lib/queries/books"
import { useBookCategoriesList } from "@/lib/queries/book-categories"
import RichTextEditor from "@/components/ui/RichTextEditor"
import MediaInput from "@/components/ui/MediaInput"
import TranslationTabs, { pickTranslationsOrEmpty } from "@/components/forms/TranslationTabs"
import { Loader2 } from "lucide-react"

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const translationSchema = z.object({
	lang: z.string().min(2),
	title: z.string().min(1, "العنوان مطلوب"),
	author: z.string().optional(),
	publisher: z.string().optional(),
	description: z.string()
		.optional()
		.refine((s) => !s || byteLength(s) <= MAX_BODY_BYTES, {
			message: `الوصف كبير جداً (الحد الأقصى ${Math.round(MAX_BODY_BYTES / 1024)} ك.ب).`,
		}),
	series: z.string().optional(),
	slug: z.string()
		.max(200, "الرابط المختصر طويل جداً (الحد الأقصى 200)")
		.refine((s) => !s || SLUG_RE.test(s), {
			message: "الرابط المختصر: أحرف لاتينية صغيرة وأرقام وشرطات فقط (مثل: al-sahifa)",
		})
		.optional(),
	meta_title: z.string().max(300).optional(),
	meta_description: z.string().max(500).optional(),
	og_image_id: z.string().nullable().optional(),
	is_default: z.boolean(),
})

const bookFormSchema = z.object({
	category_id: z.string().min(1, "التصنيف مطلوب"),
	cover_image_id: z.string().min(1, "صورة الغلاف مطلوبة"),
	isbn: z.string().optional(),
	pages: z.number().optional(),
	publish_year: z.string().optional(),
	pdf_url: z.string()
		.max(2000, "الرابط طويل جداً (الحد الأقصى 2000)")
		.refine((s) => !s || /^https?:\/\/.+/i.test(s), {
			message: "يجب أن يبدأ الرابط بـ http:// أو https://",
		})
		.optional(),
	part_number: z.number().optional(),
	parts: z.number().optional(),
	translations: z.array(translationSchema).min(1),
})

type BookFormData = z.infer<typeof bookFormSchema>

export default function BookForm({ book }: { book?: Book }) {
	const router = useRouter()
	const { languages } = useActiveLanguages()
	const createBook = useCreateBook()
	const updateBook = useUpdateBook()
	const isSaving = createBook.isPending || updateBook.isPending
	const categoriesQuery = useBookCategoriesList({ limit: 100 })
	const categories = categoriesQuery.data?.items ?? []
	const loadingCats = categoriesQuery.isLoading
	const [activeLang, setActiveLang] = useState("ar")

	const blankTranslation = (lang = "ar", is_default = true) => ({
		lang,
		title: "",
		author: "",
		publisher: "",
		description: "",
		series: "",
		slug: "",
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
				publish_year: String(new Date().getFullYear()),
				pdf_url: "",
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
				slug: t.slug ?? "",
				meta_title: t.meta_title ?? "",
				meta_description: t.meta_description ?? "",
				og_image_id: t.og_image_id ?? null,
				is_default: t.is_default ?? false,
			}))
			: [blankTranslation()]
		return {
			category_id: book.category_id ?? "",
			cover_image_id: book.cover_image_id ?? "",
			isbn: book.isbn ?? "",
			pages: book.pages ?? undefined,
			publish_year: book.publish_year ?? "",
			pdf_url: book.pdf_url ?? "",
			part_number: book.part_number ?? undefined,
			parts: book.parts ?? undefined,
			translations,
		}
	}

	const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } =
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

	const onSubmit = async (data: BookFormData) => {
		const defaults = data.translations.filter((t) => t.is_default).length
		if (defaults !== 1) {
			toast.error("يجب اختيار لغة افتراضية واحدة بالضبط")
			return
		}
		const body = {
			category_id: data.category_id,
			cover_image_id: data.cover_image_id,
			isbn: data.isbn || undefined,
			pages: data.pages,
			publish_year: data.publish_year || undefined,
			// PATCH semantics: undefined = leave unchanged, null = clear. Send
			// null on edit so an editor can actually remove a wrong PDF link.
			pdf_url: data.pdf_url || (book ? null : undefined),
			part_number: data.part_number,
			parts: data.parts,
			translations: data.translations.map((t) => ({
				...t,
				author: t.author || undefined,
				publisher: t.publisher || undefined,
				description: t.description ? sanitizeEditorHtml(t.description) : undefined,
				series: t.series || undefined,
				slug: t.slug || undefined,
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
			onError: (e: unknown) => toast.error(getErrorMessage(e, "فشل حفظ الكتاب")),
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
									<select {...register(`translations.${index}.lang`)} className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm">
										{languages.map((l) => (
											<option key={l.code} value={l.code}>{languageLabel(l.code, l.native_name)}</option>
										))}
									</select>
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
								<input {...register(`translations.${index}.title`)} dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-lg" />
								{errors.translations?.[index]?.title && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.title?.message}</p>}
							</div>

							<details className="text-sm">
								<summary className="text-gray-500 cursor-pointer hover:text-gray-700 select-none">الرابط المختصر (slug)</summary>
								<div className="mt-1 flex gap-2">
									<input {...register(`translations.${index}.slug`)} dir="ltr" placeholder="al-sahifa-al-sajjadiyya" className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary font-mono text-xs" />
									<button
										type="button"
										onClick={() => setValue(`translations.${index}.slug`, slugify(translations[index]?.title || ""), { shouldDirty: true })}
										className="cursor-pointer px-3 py-2 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 whitespace-nowrap"
									>
										توليد من العنوان
									</button>
								</div>
								<p className="mt-1 text-xs text-gray-400">اختياري — أحرف لاتينية صغيرة وأرقام وشرطات فقط. يحدّد رابط الكتاب العام لهذه اللغة؛ اتركه فارغاً ليبقى الوصول عبر المعرّف فقط.</p>
								{errors.translations?.[index]?.slug && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.slug?.message}</p>}
							</details>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">المؤلف</label>
									<input {...register(`translations.${index}.author`)} dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">الناشر</label>
									<input {...register(`translations.${index}.publisher`)} dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">السلسلة</label>
									<input {...register(`translations.${index}.series`)} dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
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
					<select {...register("category_id")} className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm">
						<option value="">اختر تصنيفاً</option>
						{categories.map((cat) => (
							<option key={cat.id} value={cat.id}>
								{categoryName(cat.book_category_translations, cat.translation)}
							</option>
						))}
					</select>
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

				<div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5 space-y-3">
					<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">تفاصيل النشر</h3>
					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">ISBN</label>
						<input {...register("isbn")} dir="ltr" placeholder="978-3-16-148410-0" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
					</div>
					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">رابط ملف PDF</label>
						<input {...register("pdf_url")} dir="ltr" placeholder="https://example.org/book.pdf" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
						<p className="mt-1 text-[11px] text-gray-500">يُستضاف ملف PDF خارجيًا — ألصق الرابط المباشر.</p>
						{errors.pdf_url && <p className="mt-1 text-sm text-red-600">{errors.pdf_url.message}</p>}
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block text-xs font-medium text-gray-500 mb-1">سنة النشر</label>
							<input type="number" {...register("publish_year")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
						</div>
						<div>
							<label className="block text-xs font-medium text-gray-500 mb-1">عدد الصفحات</label>
							<input type="number" {...register("pages", { valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
						</div>
						<div>
							<label className="block text-xs font-medium text-gray-500 mb-1">رقم الجزء</label>
							<input type="number" {...register("part_number", { valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
						</div>
						<div>
							<label className="block text-xs font-medium text-gray-500 mb-1">إجمالي الأجزاء</label>
							<input type="number" {...register("parts", { valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
						</div>
					</div>
				</div>

				<div className="flex flex-col gap-2">
					<button type="submit" disabled={isSaving} className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white font-semibold rounded-md shadow-soft hover:bg-[hsl(var(--primary)/0.92)] hover:shadow-raise disabled:opacity-50 disabled:cursor-not-allowed transition-all active:translate-y-px">
						{isSaving && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />}
						{book ? "تحديث الكتاب" : "إنشاء كتاب"}
					</button>
					<button type="button" onClick={() => router.push("/dashboard/books")} disabled={isSaving} className="cursor-pointer w-full px-6 py-2.5 border border-[hsl(var(--border-strong))] font-medium rounded-md text-foreground bg-white hover:bg-surface-muted disabled:opacity-50 transition-colors">إلغاء</button>
				</div>
			</aside>
		</form>
	)
}
