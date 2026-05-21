"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Post } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { categoryName, slugify } from "@/lib/i18n"
import { useActiveLanguages, languageLabel } from "@/lib/useLanguages"
import { byteLength, sanitizeEditorHtml, MAX_BODY_BYTES } from "@/lib/sanitize"
import { useCreatePost, useUpdatePost } from "@/lib/queries/posts"
import { usePostCategoriesList } from "@/lib/queries/post-categories"
import RichTextEditor from "@/components/ui/RichTextEditor"
import MediaInput from "@/components/ui/MediaInput"
import MediaPicker from "@/components/ui/MediaPicker"
import TranslationTabs, { pickTranslationsOrEmpty } from "@/components/forms/TranslationTabs"
import { Loader2, Eye, EyeOff, Calendar, Star, Sparkles } from "lucide-react"

const translationSchema = z.object({
	lang: z.string().min(2),
	title: z.string().min(1, "العنوان مطلوب"),
	summary: z.string().optional(),
	body: z.string()
		.min(1, "المحتوى مطلوب")
		.refine((s) => byteLength(s) <= MAX_BODY_BYTES, {
			message: `المحتوى كبير جداً (الحد الأقصى ${Math.round(MAX_BODY_BYTES / 1024)} ك.ب). اختصره أو اقسمه إلى مقالات.`,
		}),
	slug: z.string().min(1, "الرابط المختصر مطلوب"),
	is_default: z.boolean(),
	meta_title: z.string().max(80).optional(),
	meta_description: z.string().max(180).optional(),
	og_image_id: z.string().nullable().optional(),
})

const postFormSchema = z.object({
	category_id: z.string().min(1, "التصنيف مطلوب"),
	cover_image_id: z.string().nullable().optional(),
	is_published: z.boolean(),
	is_featured: z.boolean(),
	published_at: z.string().optional(),
	translations: z.array(translationSchema).min(1, "يجب إضافة ترجمة واحدة على الأقل"),
})

type PostFormData = z.infer<typeof postFormSchema>

export default function PostForm({ post }: { post?: Post }) {
	const router = useRouter()
	const { languages } = useActiveLanguages()
	const createPost = useCreatePost()
	const updatePost = useUpdatePost()
	const isSaving = createPost.isPending || updatePost.isPending
	const categoriesQuery = usePostCategoriesList({ limit: 100 })
	const categories = categoriesQuery.data?.items ?? []
	const loadingCats = categoriesQuery.isLoading
	const [activeLang, setActiveLang] = useState("ar")
	const [imagePickerOpen, setImagePickerOpen] = useState<((url: string | null) => void) | null>(null)

	const blankTranslation = (lang = "ar", is_default = true) => ({
		lang,
		title: "",
		summary: "",
		body: "",
		slug: "",
		is_default,
		meta_title: "",
		meta_description: "",
		og_image_id: null,
	})

	const buildDefaults = (): PostFormData => {
		if (!post) {
			return {
				category_id: "",
				cover_image_id: null,
				is_published: false,
				is_featured: false,
				translations: [blankTranslation()],
			}
		}
		const raw = pickTranslationsOrEmpty(post.post_translations, post.translation)
		const translations = raw.length
			? raw.map((t) => ({
				lang: t.lang,
				title: t.title ?? "",
				summary: t.summary ?? "",
				body: t.body ?? "",
				slug: t.slug ?? "",
				is_default: t.is_default ?? false,
				meta_title: t.meta_title ?? "",
				meta_description: t.meta_description ?? "",
				og_image_id: t.og_image_id ?? null,
			}))
			: [blankTranslation()]
		return {
			category_id: post.category_id ?? "",
			cover_image_id: post.cover_image_id ?? null,
			is_published: post.is_published,
			is_featured: post.is_featured ?? false,
			published_at: post.published_at ? new Date(post.published_at).toISOString().slice(0, 16) : undefined,
			translations,
		}
	}

	const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } =
		useForm<PostFormData>({
			resolver: zodResolver(postFormSchema),
			defaultValues: buildDefaults(),
		})

	useEffect(() => {
		if (post) reset(buildDefaults())
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [post?.id])

	useEffect(() => {
		if (categoriesQuery.error) {
			toast.error(getErrorMessage(categoriesQuery.error, "فشل تحميل التصنيفات"))
		}
	}, [categoriesQuery.error])

	const { fields, append, remove } = useFieldArray({ control, name: "translations" })
	const translations = watch("translations")
	const isPublished = watch("is_published")
	const isFeatured = watch("is_featured")

	const handleTitleChange = (index: number, value: string) => {
		const current = translations[index]?.slug
		if (!current) {
			setValue(`translations.${index}.slug`, slugify(value))
		}
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

	const onSubmit = (data: PostFormData) => {
		const body = {
			category_id: data.category_id,
			cover_image_id: data.cover_image_id ?? undefined,
			is_published: data.is_published,
			is_featured: data.is_featured,
			published_at: data.published_at || undefined,
			translations: data.translations.map((t) => ({
				...t,
				summary: t.summary || undefined,
				body: sanitizeEditorHtml(t.body),
				slug: t.slug || slugify(t.title),
				meta_title: t.meta_title || undefined,
				meta_description: t.meta_description || undefined,
				og_image_id: t.og_image_id ?? null,
			})),
		}
		const handlers = {
			onSuccess: () => {
				toast.success(post ? "تم تحديث المقالة" : "تم إنشاء المقالة")
				router.push("/dashboard/posts")
				router.refresh()
			},
			onError: (e: unknown) => toast.error(getErrorMessage(e, "فشل حفظ المقالة")),
		}
		if (post) {
			updatePost.mutate({ id: post.id, body }, handlers)
		} else {
			createPost.mutate(body, handlers)
		}
	}

	if (loadingCats) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

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
												onChange={(e) => { if (e.target.checked) fields.forEach((_, i) => { if (i !== index) setValue(`translations.${i}.is_default`, false) }) }}
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

								<details className="text-sm">
									<summary className="text-gray-500 cursor-pointer hover:text-gray-700 select-none">الرابط المختصر (slug)</summary>
									<input {...register(`translations.${index}.slug`)} dir="ltr" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary font-mono text-xs" />
									<p className="mt-1 text-xs text-gray-400">يُولَّد تلقائياً من العنوان. عدّله فقط إن كنت تعرف ماذا تفعل.</p>
								</details>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">الملخص</label>
									<textarea {...register(`translations.${index}.summary`)} rows={2}
										dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"}
										placeholder="جملة أو جملتان تظهران في صفحة قائمة المقالات..."
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
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
												placeholder="ابدأ كتابة محتوى المقالة..."
												dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"}
												onPickImage={pickImageForBody}
												minHeight={400}
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
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-800 mb-1.5">وصف SEO (meta description)</label>
											<textarea
												{...register(`translations.${index}.meta_description`)}
												rows={3}
												dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"}
												placeholder="إن تُرك فارغاً، يُستخدم الملخص أو مقطع من المحتوى"
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
											<p className="mt-1.5 text-xs text-gray-600">تظهر عند مشاركة المقالة في فيسبوك / تويتر. إن تُركت فارغة، تُستخدم صورة الغلاف.</p>
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
								{isPublished ? "منشور" : "مسودة"}
							</span>
							<input type="checkbox" {...register("is_published")} className="h-4 w-4 text-primary rounded" />
						</label>
						<div>
							<label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" />تاريخ النشر</label>
							<input type="datetime-local" {...register("published_at")} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
							<p className="mt-1 text-[11px] text-gray-500">إن كان في المستقبل وحالة النشر غير مفعّلة → سيُنشر تلقائياً بواسطة المُجَدوِل عند حلول الموعد.</p>
						</div>
						<label className="flex items-center justify-between cursor-pointer">
							<span className="flex items-center gap-2 text-sm text-gray-900">
								<Star className={`h-4 w-4 ${isFeatured ? "fill-amber-400 text-amber-500" : "text-gray-400"}`} />
								مقالة مميّزة
							</span>
							<input type="checkbox" {...register("is_featured")} className="h-4 w-4 text-primary rounded" />
						</label>
						{isFeatured && (
							<p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-2">
								<Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />
								<span>المقالات المميّزة تظهر في القسم الرئيسي من الصفحة الرئيسية على الموقع.</span>
							</p>
						)}
					</div>

					<div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5 space-y-4">
						<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">التصنيف</h3>
						<select {...register("category_id")} className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm">
							<option value="">اختر تصنيفاً</option>
							{categories.map((cat) => (
								<option key={cat.id} value={cat.id}>
									{categoryName(cat.post_category_translations, cat.translation)}
								</option>
							))}
						</select>
						{errors.category_id && <p className="text-sm text-red-600">{errors.category_id.message}</p>}
					</div>

					<div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5">
						<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">صورة الغلاف</h3>
						<Controller
							control={control}
							name="cover_image_id"
							render={({ field: f }) => (
								<MediaInput
									value={f.value ?? undefined}
									onChange={f.onChange}
								/>
							)}
						/>
					</div>

					<div className="flex flex-col gap-2">
						<button type="submit" disabled={isSaving} className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white font-semibold rounded-md shadow-soft hover:bg-[hsl(var(--primary)/0.92)] hover:shadow-raise disabled:opacity-50 disabled:cursor-not-allowed transition-all active:translate-y-px">
							{isSaving && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />}
							{post ? "تحديث المقالة" : "إنشاء مقالة"}
						</button>
						<button type="button" onClick={() => router.push("/dashboard/posts")} disabled={isSaving} className="cursor-pointer w-full px-6 py-2.5 border border-[hsl(var(--border-strong))] font-medium rounded-md text-foreground bg-white hover:bg-surface-muted disabled:opacity-50 transition-colors">
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
