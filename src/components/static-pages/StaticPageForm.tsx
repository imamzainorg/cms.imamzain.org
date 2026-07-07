"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { StaticPage } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { slugify } from "@/lib/i18n"
import { useActiveLanguages, languageLabel } from "@/lib/useLanguages"
import { byteLength, sanitizeEditorHtml, MAX_BODY_BYTES } from "@/lib/sanitize"
import { useCreateStaticPage, useUpdateStaticPage } from "@/lib/queries/static-pages"
import RichTextEditor from "@/components/ui/RichTextEditor"
import MediaInput from "@/components/ui/MediaInput"
import MediaPicker from "@/components/ui/MediaPicker"
import TranslationTabs, { pickTranslationsOrEmpty } from "@/components/forms/TranslationTabs"
import { Loader2, Eye, EyeOff, ListOrdered, Wand2 } from "lucide-react"

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const translationSchema = z.object({
	lang: z.string().min(2),
	title: z.string().min(1, "العنوان مطلوب").max(300, "العنوان طويل جداً (300 حرف كحد أقصى)"),
	slug: z.string()
		.min(1, "الرابط المختصر مطلوب")
		.max(200, "الرابط المختصر طويل جداً (200 حرف كحد أقصى)")
		.regex(SLUG_PATTERN, "أحرف لاتينية صغيرة وأرقام وشرطات فقط (مثال: about-imam-zain)"),
	body: z.string()
		.min(1, "المحتوى مطلوب")
		.refine((s) => byteLength(s) <= MAX_BODY_BYTES, {
			message: `المحتوى كبير جداً (الحد الأقصى ${Math.round(MAX_BODY_BYTES / 1024)} ك.ب). اختصره أو اقسمه إلى صفحات.`,
		}),
	is_default: z.boolean(),
	meta_title: z.string().max(300, "عنوان SEO طويل جداً (300 حرف كحد أقصى)").optional(),
	meta_description: z.string().max(500, "وصف SEO طويل جداً (500 حرف كحد أقصى)").optional(),
	og_image_id: z.string().nullable().optional(),
})

const staticPageFormSchema = z.object({
	display_order: z.number("أدخل رقماً صحيحاً").int("أدخل رقماً صحيحاً").min(0, "الترتيب لا يقل عن صفر"),
	is_published: z.boolean(),
	translations: z.array(translationSchema).min(1, "يجب إضافة ترجمة واحدة على الأقل"),
})

type StaticPageFormData = z.infer<typeof staticPageFormSchema>

export default function StaticPageForm({ page }: { page?: StaticPage }) {
	const router = useRouter()
	const { languages } = useActiveLanguages()
	const createPage = useCreateStaticPage()
	const updatePage = useUpdateStaticPage()
	const isSaving = createPage.isPending || updatePage.isPending
	const [activeLang, setActiveLang] = useState("ar")
	const [imagePickerOpen, setImagePickerOpen] = useState<((url: string | null) => void) | null>(null)

	const blankTranslation = (lang = "ar", is_default = true) => ({
		lang,
		title: "",
		slug: "",
		body: "",
		is_default,
		meta_title: "",
		meta_description: "",
		og_image_id: null,
	})

	const buildDefaults = (): StaticPageFormData => {
		if (!page) {
			return {
				display_order: 0,
				is_published: false,
				translations: [blankTranslation()],
			}
		}
		const raw = pickTranslationsOrEmpty(page.static_page_translations, page.translation)
		const translations = raw.length
			? raw.map((t) => ({
				lang: t.lang,
				title: t.title ?? "",
				slug: t.slug ?? "",
				body: t.body ?? "",
				is_default: t.is_default ?? false,
				meta_title: t.meta_title ?? "",
				meta_description: t.meta_description ?? "",
				og_image_id: t.og_image_id ?? null,
			}))
			: [blankTranslation()]
		return {
			display_order: page.display_order ?? 0,
			is_published: page.is_published,
			translations,
		}
	}

	const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } =
		useForm<StaticPageFormData>({
			resolver: zodResolver(staticPageFormSchema),
			defaultValues: buildDefaults(),
		})

	useEffect(() => {
		if (page) reset(buildDefaults())
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page?.id])

	const { fields, append, remove } = useFieldArray({ control, name: "translations" })
	const translations = watch("translations")
	const isPublished = watch("is_published")

	const handleTitleChange = (index: number, value: string) => {
		const current = translations[index]?.slug
		if (!current) {
			setValue(`translations.${index}.slug`, slugify(value))
		}
	}

	const regenerateSlug = (index: number) => {
		const title = translations[index]?.title ?? ""
		setValue(`translations.${index}.slug`, slugify(title), { shouldValidate: true })
	}

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

	const pickImageForBody = (): Promise<string | null> => {
		return new Promise((resolve) => {
			setImagePickerOpen(() => resolve)
		})
	}

	const onSubmit = (data: StaticPageFormData) => {
		const defaults = data.translations.filter((t) => t.is_default).length
		if (defaults !== 1) {
			toast.error("يجب اختيار لغة افتراضية واحدة بالضبط")
			return
		}
		const body = {
			display_order: data.display_order,
			is_published: data.is_published,
			translations: data.translations.map((t) => ({
				...t,
				body: sanitizeEditorHtml(t.body),
				slug: t.slug || slugify(t.title),
				meta_title: t.meta_title || undefined,
				meta_description: t.meta_description || undefined,
				og_image_id: t.og_image_id ?? null,
			})),
		}
		const handlers = {
			onSuccess: () => {
				toast.success(page ? "تم تحديث الصفحة" : "تم إنشاء الصفحة")
				router.push("/dashboard/static-pages")
				router.refresh()
			},
			onError: (e: unknown) => toast.error(getErrorMessage(e, "فشل حفظ الصفحة")),
		}
		if (page) {
			updatePage.mutate({ id: page.id, body }, handlers)
		} else {
			createPage.mutate(body, handlers)
		}
	}

	return (
		<>
			<form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-6">
					<TranslationTabs
						fields={fields}
						translations={translations}
						activeLang={activeLang}
						onChangeActiveLang={(l) => setActiveLang(l)}
						onAdd={addTranslation}
						onRemove={removeTranslation}
						title="المحتوى"
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
											<input type="checkbox" {...register(`translations.${index}.is_default`)}
												onChange={(e) => { if (e.target.checked) { fields.forEach((_, i) => setValue(`translations.${i}.is_default`, i === index)) } else { setValue(`translations.${index}.is_default`, false) } }}
												className="h-4 w-4 text-primary rounded" />
											<span className="text-sm text-gray-900">اللغة الافتراضية</span>
										</label>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">العنوان *</label>
									<input
										{...register(`translations.${index}.title`, { onChange: (e) => handleTitleChange(index, e.target.value) })}
										dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-lg"
									/>
									{errors.translations?.[index]?.title && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.title?.message}</p>}
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">الرابط المختصر (slug) *</label>
									<div className="flex gap-2">
										<input {...register(`translations.${index}.slug`)} dir="ltr" placeholder="about-imam-zain"
											className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary font-mono text-xs" />
										<button
											type="button"
											onClick={() => regenerateSlug(index)}
											title="توليد من العنوان"
											className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary border border-[hsl(var(--primary)/0.3)] rounded-md hover:bg-[hsl(var(--primary)/0.06)] transition-colors"
										>
											<Wand2 className="h-3.5 w-3.5" strokeWidth={1.6} />توليد
										</button>
									</div>
									<p className="mt-1 text-xs text-gray-400">أحرف لاتينية صغيرة وأرقام وشرطات فقط. فريد لكل لغة.</p>
									{errors.translations?.[index]?.slug && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.slug?.message}</p>}
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">المحتوى *</label>
									<Controller
										control={control}
										name={`translations.${index}.body`}
										render={({ field: f }) => (
											<RichTextEditor
												value={f.value}
												onChange={f.onChange}
												placeholder="ابدأ كتابة محتوى الصفحة..."
												dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"}
												onPickImage={pickImageForBody}
												minHeight={400}
												maxBytes={MAX_BODY_BYTES}
											/>
										)}
									/>
									{errors.translations?.[index]?.body && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.body?.message}</p>}
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
											{errors.translations?.[index]?.meta_title && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.meta_title?.message}</p>}
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-800 mb-1.5">وصف SEO (meta description)</label>
											<textarea
												{...register(`translations.${index}.meta_description`)}
												rows={3}
												dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"}
												placeholder="إن تُرك فارغاً، يُستخدم مقطع من المحتوى"
												className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-base text-gray-900 bg-white placeholder:text-gray-400"
											/>
											<p className="mt-1.5 text-xs text-gray-600">يظهر تحت العنوان في نتائج البحث. الحد الأمثل 150–160 حرفاً.</p>
											{errors.translations?.[index]?.meta_description && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.meta_description?.message}</p>}
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
											<p className="mt-1.5 text-xs text-gray-600">تظهر عند مشاركة الصفحة في فيسبوك / تويتر.</p>
										</div>
									</div>
								</details>
							</>
						)}
					/>
				</div>

				<aside className="space-y-6">
					<div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5 space-y-4">
						<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">حالة النشر</h3>
						<label className="flex items-center justify-between cursor-pointer">
							<span className="flex items-center gap-2 text-sm text-gray-900">
								{isPublished ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
								{isPublished ? "منشورة" : "مسودة"}
							</span>
							<input type="checkbox" {...register("is_published")} className="h-4 w-4 text-primary rounded" />
						</label>
					</div>

					<div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5 space-y-2">
						<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
							<ListOrdered className="h-4 w-4" strokeWidth={1.6} />ترتيب العرض
						</h3>
						<input
							type="number"
							min={0}
							{...register("display_order", {
								// Emptied field → 0 (the API default) instead of NaN.
								setValueAs: (v) => (v === "" || v == null ? 0 : Number(v)),
							})}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
						/>
						<p className="text-[11px] text-gray-500">الصفحات ذات الرقم الأصغر تظهر أولاً في قوائم الموقع.</p>
						{errors.display_order && <p className="text-sm text-red-600">{errors.display_order.message}</p>}
					</div>

					<div className="flex flex-col gap-2">
						<button type="submit" disabled={isSaving} className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white font-semibold rounded-md shadow-soft hover:bg-[hsl(var(--primary)/0.92)] hover:shadow-raise disabled:opacity-50 disabled:cursor-not-allowed transition-all active:translate-y-px">
							{isSaving && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />}
							{page ? "تحديث الصفحة" : "إنشاء صفحة"}
						</button>
						<button type="button" onClick={() => router.push("/dashboard/static-pages")} disabled={isSaving} className="cursor-pointer w-full px-6 py-2.5 border border-[hsl(var(--border-strong))] font-medium rounded-md text-foreground bg-white hover:bg-surface-muted disabled:opacity-50 transition-colors">
							إلغاء
						</button>
					</div>
				</aside>
			</form>

			<MediaPicker
				open={!!imagePickerOpen}
				onClose={() => { imagePickerOpen?.(null); setImagePickerOpen(null) }}
				onSelect={(m) => { imagePickerOpen?.(m.url); setImagePickerOpen(null) }}
				title="اختر صورة لإدراجها في المحتوى"
			/>
		</>
	)
}
