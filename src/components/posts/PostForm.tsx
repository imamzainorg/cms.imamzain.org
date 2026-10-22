"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import axios from "axios"
import type { Post } from "@/types"
import { toast } from "sonner"
import { getErrorMessage, getErrorCode, getErrorStatus } from "@/lib/api"
import { galleryService } from "@/services/gallery.service"
import { categoryName, slugify } from "@/lib/i18n"
import { isoToLocalInput, localInputToIso } from "@/lib/datetime"
import { useActiveLanguages, languageLabel } from "@/lib/useLanguages"
import { byteLength, sanitizeEditorHtml, MAX_BODY_BYTES } from "@/lib/sanitize"
import { useCreatePost, useUpdatePost } from "@/lib/queries/posts"
import { usePostCategoriesList } from "@/lib/queries/post-categories"
import RichTextEditor from "@/components/ui/RichTextEditor"
import MediaInput from "@/components/ui/MediaInput"
import MediaPicker from "@/components/ui/MediaPicker"
import AttachmentsInput from "@/components/ui/AttachmentsInput"
import TranslationTabs, { pickTranslationsOrEmpty } from "@/components/forms/TranslationTabs"
import { Loader2, Eye, EyeOff, Calendar, Star, Sparkles } from "lucide-react"

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Server limits (worker/src/features/posts/schemas.ts) — inputs mirror them.
const TITLE_MAX = 500
const SUMMARY_MAX = 5000
const SLUG_MAX = 200

const translationSchema = z.object({
	lang: z.string().min(2),
	title: z.string().min(1, "العنوان مطلوب").max(TITLE_MAX, `العنوان أطول من ${TITLE_MAX} حرفاً`),
	summary: z.string().max(SUMMARY_MAX, `الملخص أطول من ${SUMMARY_MAX} حرفاً`).optional(),
	body: z.string()
		.min(1, "المحتوى مطلوب")
		.refine((s) => byteLength(s) <= MAX_BODY_BYTES, {
			message: `المحتوى كبير جداً (الحد الأقصى ${Math.round(MAX_BODY_BYTES / 1024)} ك.ب). اختصره أو اقسمه إلى أخبار.`,
		}),
	is_default: z.boolean(),
	meta_title: z.string().max(80).optional(),
	meta_description: z.string().max(180).optional(),
	og_image_id: z.string().nullable().optional(),
})

const postFormSchema = z.object({
	category_id: z.string().min(1, "التصنيف مطلوب"),
	cover_image_id: z.string().nullable().optional(),
	attachments: z.array(z.object({
		id: z.string(),
		url: z.string(),
		filename: z.string().optional(),
		mime_type: z.string().optional(),
	})),
	// Media ids (cover and/or attachments) to also add to the public image gallery on save.
	gallery_ids: z.array(z.string()),
	slug: z.string()
		.min(1, "الرابط المختصر مطلوب")
		.max(SLUG_MAX, `الرابط أطول من ${SLUG_MAX} حرفاً`)
		.regex(SLUG_RE, "أحرف لاتينية صغيرة وأرقام وشرطات فقط (مثال: hayat-al-imam-zain)"),
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
				attachments: [],
				gallery_ids: [],
				slug: "",
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
				is_default: t.is_default ?? false,
				meta_title: t.meta_title ?? "",
				meta_description: t.meta_description ?? "",
				og_image_id: t.og_image_id ?? null,
			}))
			: [blankTranslation()]
		return {
			category_id: post.category_id ?? "",
			cover_image_id: post.cover_image_id ?? null,
			gallery_ids: [],
			attachments: [...(post.post_attachments ?? [])]
				.sort((a, b) => a.display_order - b.display_order)
				.map((a) => ({
					id: a.media_id,
					url: a.media?.url ?? "",
					filename: a.media?.filename,
					mime_type: a.media?.mime_type,
				})),
			slug: post.slug ?? "",
			is_published: post.is_published,
			is_featured: post.is_featured ?? false,
			// A datetime-local input shows WALL-CLOCK time: convert the stored instant
			// through the browser's zone (slicing the UTC ISO string shifted it).
			published_at: isoToLocalInput(post.published_at),
			translations,
		}
	}

	const { register, handleSubmit, control, watch, setValue, setError, reset, formState: { errors } } =
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
	const slugValue = watch("slug")
	// A live post's slug is its public URL: the API refuses to rename it while it
	// is (and stays) published. Unticking "published" in the same save unlocks it.
	const slugLocked = !!post?.is_published && isPublished

	const handleTitleChange = (index: number, value: string) => {
		if (!translations[index]?.is_default) return
		if (!slugValue) {
			setValue("slug", slugify(value))
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

	// Adds the ticked images to the gallery; one already there (409) is fine and is skipped quietly.
	const addToGallery = async (ids: string[], data: PostFormData, fallbackTitle: string) => {
		let added = 0
		for (const id of ids) {
			const file = data.attachments.find((a) => a.id === id)?.filename
			const title = (file ? file.replace(/\.[^.]+$/, "") : fallbackTitle).slice(0, 500) || "صورة"
			try {
				await galleryService.create({ media_id: id, translations: [{ lang: "ar", title }] })
				added++
			} catch (err) {
				if (getErrorStatus(err) !== 409) toast.error(getErrorMessage(err, "تعذّرت إضافة صورة إلى المعرض"))
			}
		}
		if (added) toast.success(`تمت إضافة ${added} صورة إلى معرض الصور`)
	}

	const onSubmit = (data: PostFormData) => {
		const defaults = data.translations.filter((t) => t.is_default).length
		if (defaults !== 1) {
			toast.error("يجب اختيار لغة افتراضية واحدة بالضبط")
			return
		}
		// Schedule rules (API): a post that is published NOW is stamped with the
		// current time, whatever date was sent, so the field only matters while
		// the post stays a draft — a FUTURE date schedules it (the minute cron
		// flips it live), a past date is dropped. PATCH: undefined leaves it
		// alone, null clears it, so an emptied field must send null.
		const scheduledAt = localInputToIso(data.published_at)
		const initialSchedule = isoToLocalInput(post?.published_at)
		if (!data.is_published && scheduledAt && new Date(scheduledAt).getTime() <= Date.now() && data.published_at !== initialSchedule) {
			setError("published_at", { type: "validate", message: "الموعد في الماضي — اختر موعداً مستقبلياً أو اتركه فارغاً لحفظها مسودة." })
			return
		}
		const publishedAt = data.is_published ? undefined : scheduledAt ?? (post ? null : undefined)
		const body = {
			category_id: data.category_id,
			// null removes the cover on PATCH; undefined would silently keep it.
			cover_image_id: data.cover_image_id ?? (post ? null : undefined),
			// Full ordered list; on PATCH an empty array clears them (omitting would keep them).
			attachment_ids: data.attachments.length > 0 || post ? data.attachments.map((a) => a.id) : undefined,
			slug: data.slug,
			is_published: data.is_published,
			is_featured: data.is_featured,
			published_at: publishedAt,
			translations: data.translations.map((t) => ({
				...t,
				summary: t.summary || undefined,
				body: sanitizeEditorHtml(t.body),
				meta_title: t.meta_title || undefined,
				meta_description: t.meta_description || undefined,
				og_image_id: t.og_image_id ?? null,
			})),
		}
		const defaultTitle = data.translations.find((t) => t.is_default)?.title ?? ""
		const handlers = {
			onSuccess: async () => {
				toast.success(post ? "تم تحديث الخبر" : "تم إنشاء الخبر")
				await addToGallery(data.gallery_ids, data, defaultTitle)
				router.push("/dashboard/posts")
				router.refresh()
			},
			onError: (e: unknown) => {
				if (axios.isAxiosError(e) && e.response?.status === 409) {
					// 409 covers more than the slug (a language or attachment listed
					// twice, …): only blame the slug field when it really is the slug.
					const text = String((e.response.data as { error?: unknown } | undefined)?.error ?? "")
					if (getErrorCode(e) === "SLUG_LOCKED_WHILE_PUBLISHED" || /\bslug\b/i.test(text)) {
						setError("slug", { type: "server", message: getErrorMessage(e, "الرابط المختصر مستخدم بالفعل") })
						return
					}
				}
				toast.error(getErrorMessage(e, "فشل حفظ الخبر"))
			},
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
										maxLength={TITLE_MAX}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-lg"
									/>
									{errors.translations?.[index]?.title && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.title?.message}</p>}
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">الملخص</label>
									<textarea {...register(`translations.${index}.summary`)} rows={2}
										maxLength={SUMMARY_MAX}
										dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"}
										placeholder="جملة أو جملتان تظهران في صفحة قائمة الأخبار..."
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
												placeholder="ابدأ كتابة محتوى الخبر..."
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
											<p className="mt-1.5 text-xs text-gray-600">تظهر عند مشاركة الخبر في فيسبوك / تويتر. إن تُركت فارغة، تُستخدم صورة الغلاف.</p>
										</div>
									</div>
								</details>
							</>
						)}
					/>
				</div>

				<aside className="space-y-6">
					<div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5 space-y-2">
						<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">الرابط المختصر</h3>
						<input
							{...register("slug")}
							dir="ltr"
							maxLength={SLUG_MAX}
							// readOnly, not disabled: react-hook-form drops a disabled input's value (submits undefined).
							readOnly={slugLocked}
							placeholder="hayat-al-imam-zain"
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm font-mono read-only:bg-gray-50 read-only:text-gray-500 read-only:cursor-not-allowed"
						/>
						{errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>}
						{slugLocked ? (
							<p className="mt-1 text-[11px] text-amber-700">الرابط ثابت لأن الخبر منشور (رابطه العام قد شاركه الناس). ألغِ النشر أولاً إن كان لا بد من تغييره.</p>
						) : (
							<p className="mt-1 text-[11px] text-gray-400">يُولَّد تلقائياً من العنوان الافتراضي. رابط واحد لكل خبر بجميع اللغات.</p>
						)}
					</div>

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
							<label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" />{isPublished ? "تاريخ النشر" : "جدولة النشر"}</label>
							<input type="datetime-local" {...register("published_at")} disabled={isPublished} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
							{errors.published_at && <p className="mt-1 text-sm text-red-600">{errors.published_at.message}</p>}
							{isPublished ? (
								<p className="mt-1 text-[11px] text-gray-500">الخبر المنشور يُسجَّل له وقت النشر تلقائياً عند الحفظ. لجدولته لوقت لاحق: ألغِ خيار «منشور» ثم حدّد موعداً.</p>
							) : (
								<p className="mt-1 text-[11px] text-gray-500">حدّد موعداً مستقبلياً (بتوقيت جهازك) ليُنشر الخبر تلقائياً. قد يتأخر النشر حتى دقيقة عن الموعد. اتركه فارغاً لتبقى مسودة.</p>
							)}
						</div>
						<label className="flex items-center justify-between cursor-pointer">
							<span className="flex items-center gap-2 text-sm text-gray-900">
								<Star className={`h-4 w-4 ${isFeatured ? "fill-amber-400 text-amber-500" : "text-gray-400"}`} />
								خبر مميّز
							</span>
							<input type="checkbox" {...register("is_featured")} className="h-4 w-4 text-primary rounded" />
						</label>
						{isFeatured && (
							<p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-2">
								<Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />
								<span>الأخبار المميّزة تظهر في القسم الرئيسي من الصفحة الرئيسية على الموقع.</span>
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
						<Controller
							control={control}
							name="gallery_ids"
							render={({ field: g }) => {
								const cover = watch("cover_image_id")
								if (!cover) return <></>
								return (
									<label className="mt-3 flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
										<input
											type="checkbox"
											checked={g.value.includes(cover)}
											onChange={(e) => g.onChange(e.target.checked ? [...g.value, cover] : g.value.filter((x) => x !== cover))}
											className="h-4 w-4 text-primary rounded"
										/>
										إضافة هذه الصورة إلى معرض الصور؟
									</label>
								)
							}}
						/>
					</div>

					<div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5">
						<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">المرفقات</h3>
						<Controller
							control={control}
							name="attachments"
							render={({ field: f }) => (
								<Controller
									control={control}
									name="gallery_ids"
									render={({ field: g }) => (
										<AttachmentsInput
											value={f.value}
											onChange={f.onChange}
											galleryIds={g.value}
											onGalleryChange={g.onChange}
										/>
									)}
								/>
							)}
						/>
					</div>

					<div className="flex flex-col gap-2">
						<button type="submit" disabled={isSaving} className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white font-semibold rounded-md shadow-soft hover:bg-[hsl(var(--primary)/0.92)] hover:shadow-raise disabled:opacity-50 disabled:cursor-not-allowed transition-all active:translate-y-px">
							{isSaving && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />}
							{post ? "تحديث الخبر" : "إنشاء خبر"}
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
