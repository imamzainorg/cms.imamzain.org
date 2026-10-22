"use client"

import { useState, useCallback } from "react"
import type { GalleryImage, GalleryCategory } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { categoryName, pickTranslation } from "@/lib/i18n"
import { useActiveLanguages, languageLabel } from "@/lib/useLanguages"
import { Upload, Trash2, ImageIcon, Loader2, Search, X, Save, Plus, MapPin, Tag, Eye, EyeOff } from "lucide-react"
import { safeFormat, toArabicDigits } from "@/lib/dates"
import Badge from "@/components/ui/Badge"
import EmptyState from "@/components/ui/EmptyState"
import IconButton from "@/components/ui/IconButton"
import FilterPills from "@/components/ui/FilterPills"
import MediaInput from "@/components/ui/MediaInput"
import PageHeader from "@/components/layout/PageHeader"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { CardGridSkeleton } from "@/components/ui/Skeleton"
import { useUploadMedia } from "@/lib/queries/media"
import {
	useGalleryList,
	useGalleryImage,
	useCreateGalleryItem,
	useUpdateGalleryItem,
	useDeleteGalleryItem,
	useTogglePublishGallery,
} from "@/lib/queries/gallery"
import { useGalleryCategoriesList } from "@/lib/queries/gallery-categories"
import { useTranslationsField } from "@/lib/use-translations-field"

type StatusFilter = "all" | "published" | "draft"

// Gallery limits (worker/src/features/gallery/schemas.ts).
const GALLERY_LIST_MAX = 50
const GALLERY_LABEL_MAX = 200

export default function GalleryPage() {
	const [search, setSearch] = useState("")
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
	// media_id of the image being edited — the dialog fetches the FULL record
	// itself (list payloads are slim: translations drop `description`, so
	// seeding the form from a list item would silently wipe descriptions on save).
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const { confirm, dialog } = useConfirm()

	// GalleryQueryDto has no is_published filter (forbidNonWhitelisted would
	// 400 it) — filter by status client-side over the fetched batch instead.
	const galleryQuery = useGalleryList({ limit: 100 })
	const categoriesQuery = useGalleryCategoriesList({ limit: 100 })
	const images = galleryQuery.data?.items ?? []
	const categories = categoriesQuery.data?.items ?? []
	const loading = galleryQuery.isLoading

	const uploadMedia = useUploadMedia()
	const createGallery = useCreateGalleryItem()
	const deleteGallery = useDeleteGalleryItem()
	const togglePublish = useTogglePublishGallery()
	const uploading = uploadMedia.isPending || createGallery.isPending

	const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files
		if (!files?.length) return
		try {
			for (const file of Array.from(files)) {
				const media = await uploadMedia.mutateAsync(file)
				await createGallery.mutateAsync({
					media_id: media.id,
					// title is required (1–500 chars): the file name, or a placeholder for ".jpg".
					translations: [{ lang: "ar", title: file.name.replace(/\.[^.]+$/, "").slice(0, 500) || "صورة" }],
				})
			}
			toast.success(`تم رفع ${files.length} صورة`)
		} catch (err) {
			toast.error(getErrorMessage(err, "فشل الرفع"))
		} finally {
			e.target.value = ""
		}
	}, [uploadMedia, createGallery])

	const handleDelete = async (mediaId: string) => {
		const ok = await confirm({
			title: "حذف هذه الصورة من المعرض؟",
			description: "تُحذف الصورة من المعرض، لكن الملف يبقى في مكتبة الوسائط.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		deleteGallery.mutate(mediaId, {
			onSuccess: () => { toast.success("تم الحذف"); setSelectedId(null) },
			onError: (e) => toast.error(getErrorMessage(e, "فشل الحذف")),
		})
	}

	const handleTogglePublish = (img: GalleryImage) => {
		togglePublish.mutate(
			{ id: img.media_id, is_published: !img.is_published },
			{
				onSuccess: () => toast.success(img.is_published ? "تم سحب النشر" : "تم النشر"),
				onError: (e) => toast.error(getErrorMessage(e, "تعذّر التحديث")),
			},
		)
	}

	const getTitle = (img: GalleryImage) =>
		pickTranslation(img.gallery_image_translations, img.translation)?.title || ""

	const filtered = images.filter((img) => {
		if (statusFilter !== "all" && img.is_published !== (statusFilter === "published")) return false
		const title = getTitle(img).toLowerCase()
		const q = search.toLowerCase()
		return !q || title.includes(q) || img.tags.some((t) => t.toLowerCase().includes(q))
	})

	return (
		<div className="space-y-6">
			<PageHeader
				title="معرض الصور"
				description="اعرض صور الفعاليات والأحداث. اضغط أي صورة لتعديل بياناتها."
				icon={ImageIcon}
				actions={
					<div className="flex gap-2">
						<a href="/dashboard/gallery/trash" className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
							<Trash2 className="h-4 w-4" />سلة المهملات
						</a>
						<label className={`inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 cursor-pointer transition-colors ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}>
							{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
							{uploading ? "جارٍ الرفع..." : "رفع صور"}
							<input type="file" multiple accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" />
						</label>
					</div>
				}
			/>

			<div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
				<div className="relative flex-1 min-w-50">
					<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
					<input
						type="text" placeholder="ابحث بالعنوان أو الوسم..."
						value={search} onChange={(e) => setSearch(e.target.value)}
						className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary bg-white"
					/>
				</div>
				<FilterPills<StatusFilter>
					variant="segmented"
					value={statusFilter}
					onChange={setStatusFilter}
					options={[
						{ value: "all", label: "الكل" },
						{ value: "published", label: "منشور" },
						{ value: "draft", label: "مسودة" },
					]}
				/>
			</div>

			{loading ? (
				<CardGridSkeleton count={10} aspect="aspect-square" cols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" />
			) : filtered.length === 0 ? (
				<EmptyState
					variant="card"
					icon={ImageIcon}
					title={search ? "لا توجد صور تطابق البحث" : "لا توجد صور في المعرض بعد"}
					description={search ? "جرّب كلمات بحث مختلفة." : "ارفع صوراً لإنشاء معرض يظهر للزائرين على الموقع."}
					action={!search && (
						<label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90 ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}>
							{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
							ارفع أول صورة
							<input type="file" multiple accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" />
						</label>
					)}
				/>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
					{filtered.map((image) => (
						<div key={image.media_id} className="group relative aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-primary">
							<button
								onClick={() => setSelectedId(image.media_id)}
								className="absolute inset-0 w-full h-full bg-gray-100 text-right cursor-pointer">
								{image.media?.url ? (
									<img src={image.media.url} alt={getTitle(image)} className="w-full h-full object-cover" />
								) : (
									<div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-10 w-10 text-gray-300" /></div>
								)}
								<div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/40 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
									<p className="text-white text-xs truncate font-medium">{getTitle(image) || "بدون عنوان"}</p>
									<p className="text-white/70 text-[10px] flex items-center gap-1 mt-0.5">
										<Eye className="h-3 w-3" strokeWidth={1.6} />{toArabicDigits(String(image.views ?? 0))}
									</p>
								</div>
							</button>
							<div className="absolute top-2 right-2 z-10 pointer-events-none">
								<Badge variant={image.is_published ? "success" : "default"} dot>
									{image.is_published ? "منشور" : "مسودة"}
								</Badge>
							</div>
							<div className="absolute top-2 left-2 z-10">
								<IconButton
									onClick={() => handleTogglePublish(image)}
									disabled={togglePublish.isPending}
									label={image.is_published ? "سحب النشر" : "نشر"}
									icon={image.is_published
										? <EyeOff className="h-3.5 w-3.5" strokeWidth={1.6} />
										: <Eye className="h-3.5 w-3.5" strokeWidth={1.6} />}
									className="bg-white/90 hover:bg-white shadow-sm"
								/>
							</div>
						</div>
					))}
				</div>
			)}

			{selectedId && (
				<GalleryImageDialog
					mediaId={selectedId}
					categories={categories}
					onClose={() => setSelectedId(null)}
					onSaved={() => setSelectedId(null)}
					onDelete={() => handleDelete(selectedId)}
				/>
			)}
			{dialog}
		</div>
	)
}

function GalleryImageDialog({
	mediaId,
	categories,
	onClose,
	onSaved,
	onDelete,
}: {
	mediaId: string
	categories: GalleryCategory[]
	onClose: () => void
	onSaved: () => void
	onDelete: () => void
}) {
	// The grid only has the SLIM list item (translations drop `description`).
	// Fetch the full record before seeding the form — otherwise saving would
	// silently wipe every stored description.
	const detailQuery = useGalleryImage(mediaId)

	if (!detailQuery.data) {
		return (
			<div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
				<div className="bg-white rounded-xl px-8 py-6 shadow-2xl flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
					{detailQuery.isError ? (
						<p className="text-sm text-red-600">{getErrorMessage(detailQuery.error, "تعذّر تحميل بيانات الصورة")}</p>
					) : (
						<>
							<Loader2 className="h-5 w-5 animate-spin text-primary" />
							<p className="text-sm text-gray-600">جارٍ تحميل بيانات الصورة…</p>
						</>
					)}
				</div>
			</div>
		)
	}

	return (
		<GalleryImageDialogContent
			image={detailQuery.data}
			categories={categories}
			onClose={onClose}
			onSaved={onSaved}
			onDelete={onDelete}
		/>
	)
}

function GalleryImageDialogContent({
	image,
	categories,
	onClose,
	onSaved,
	onDelete,
}: {
	image: GalleryImage
	categories: GalleryCategory[]
	onClose: () => void
	onSaved: () => void
	onDelete: () => void
}) {
	const { languages } = useActiveLanguages()
	const updateGallery = useUpdateGalleryItem()
	const saving = updateGallery.isPending
	const [categoryId, setCategoryId] = useState(image.category_id ?? "")
	const [author, setAuthor] = useState(image.author ?? "")
	const [takenAt, setTakenAt] = useState(image.taken_at ? image.taken_at.slice(0, 10) : "")
	const [tags, setTags] = useState<string[]>(image.tags ?? [])
	const [locations, setLocations] = useState<string[]>(image.locations ?? [])
	const [tagInput, setTagInput] = useState("")
	const [locInput, setLocInput] = useState("")
	const [isPublished, setIsPublished] = useState(image.is_published)
	type GalleryTranslationDraft = {
		lang: string
		title: string
		description: string
		meta_title: string
		meta_description: string
		og_image_id: string | null
	}
	const {
		translations,
		activeLang,
		setActiveLang,
		updateAt: updateT,
		addLang: addTranslation,
		removeAt: removeTranslation,
	} = useTranslationsField<GalleryTranslationDraft>({
		initial: image.gallery_image_translations.length
			? image.gallery_image_translations.map((t) => ({
				lang: t.lang,
				title: t.title ?? "",
				description: t.description ?? "",
				meta_title: t.meta_title ?? "",
				meta_description: t.meta_description ?? "",
				og_image_id: t.og_image_id ?? null,
			}))
			: [{ lang: "ar", title: "", description: "", meta_title: "", meta_description: "", og_image_id: null }],
		languages,
		makeBlank: (lang) => ({ lang, title: "", description: "", meta_title: "", meta_description: "", og_image_id: null }),
		requireDefault: false,
	})

	// Server limits (worker/src/features/gallery/schemas.ts): ≤ 50 entries of ≤ 200 chars each.
	const addTag = () => {
		if (!tagInput.trim() || tags.includes(tagInput.trim())) return
		if (tags.length >= GALLERY_LIST_MAX) { toast.error(`الحد الأقصى ${GALLERY_LIST_MAX} وسماً`); return }
		setTags([...tags, tagInput.trim()]); setTagInput("")
	}
	const addLoc = () => {
		if (!locInput.trim() || locations.includes(locInput.trim())) return
		if (locations.length >= GALLERY_LIST_MAX) { toast.error(`الحد الأقصى ${GALLERY_LIST_MAX} موقعاً`); return }
		setLocations([...locations, locInput.trim()]); setLocInput("")
	}

	const handleSave = () => {
		updateGallery.mutate(
			{
				id: image.media_id,
				body: {
					// null disconnects the category ("— بدون —"); undefined would keep it.
				category_id: categoryId || null,
					// null clears; undefined would leave the stored value in place.
					author: author.trim() || null,
					taken_at: takenAt ? new Date(takenAt).toISOString() : null,
					tags,
					locations,
					is_published: isPublished,
					translations: translations
						.filter((t) => t.title.trim())
						.map((t) => ({
							lang: t.lang,
							title: t.title,
							description: t.description || undefined,
							meta_title: t.meta_title || undefined,
							meta_description: t.meta_description || undefined,
							og_image_id: t.og_image_id,
						})),
				},
			},
			{
				onSuccess: () => { toast.success("تم الحفظ"); onSaved() },
				onError: (e) => toast.error(getErrorMessage(e, "فشل الحفظ")),
			},
		)
	}

	const catName = (c: GalleryCategory) =>
		categoryName(c.gallery_category_translations, c.translation)

	return (
		<div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
			<div className="bg-white rounded-xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
				<div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
					<h2 className="text-lg font-semibold text-gray-900">تفاصيل الصورة</h2>
					<button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
				</div>

				<div className="flex-1 overflow-y-auto">
					<div className="grid grid-cols-1 md:grid-cols-5 gap-0">
						<div className="md:col-span-2 bg-gray-900 flex items-center justify-center min-h-75 md:min-h-125 relative">
							{image.media?.url ? (
								<img src={image.media.url} alt="" className="max-w-full max-h-[60vh] object-contain" />
							) : (
								<ImageIcon className="h-20 w-20 text-gray-600" />
							)}
							{image.media?.width && image.media?.height && (
								<span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
									{image.media.width}×{image.media.height}
								</span>
							)}
						</div>

						<div className="md:col-span-3 p-6 space-y-4">
							<label className="flex items-center justify-between p-3 border border-gray-200 rounded-md cursor-pointer bg-gray-50">
								<span className="flex items-center gap-2 text-sm text-gray-900">
									{isPublished ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
									{isPublished ? "منشورة" : "مسودة"}
								</span>
								<input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4 text-primary rounded" />
							</label>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-xs font-medium text-gray-500 mb-1">التصنيف</label>
									<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm">
										<option value="">— بدون —</option>
										{categories.map((c) => <option key={c.id} value={c.id}>{catName(c)}</option>)}
									</select>
								</div>
								<div>
									<label className="block text-xs font-medium text-gray-500 mb-1">المصوِّر</label>
									<input value={author} maxLength={300} onChange={(e) => setAuthor(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
								</div>
								<div>
									<label className="block text-xs font-medium text-gray-500 mb-1">تاريخ الالتقاط</label>
									<input type="date" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
								</div>
								<div>
									<label className="block text-xs font-medium text-gray-500 mb-1">رُفعت في</label>
									<p className="px-3 py-2 text-sm text-gray-600">{safeFormat(image.created_at, "dd/MM/yyyy")}</p>
								</div>
								<div>
									<label className="block text-xs font-medium text-gray-500 mb-1">المشاهدات</label>
									<p className="px-3 py-2 text-sm text-gray-600 flex items-center gap-1"><Eye className="h-3.5 w-3.5" strokeWidth={1.6} />{toArabicDigits(String(image.views ?? 0))}</p>
								</div>
							</div>

							<div>
								<label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Tag className="h-3 w-3" />الوسوم</label>
								<div className="flex gap-2">
									<input value={tagInput} maxLength={GALLERY_LABEL_MAX} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag() } }} placeholder="أضف وسماً، اضغط Enter" className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
									<button type="button" onClick={addTag} className="px-2.5 bg-gray-100 rounded-md hover:bg-gray-200"><Plus className="h-4 w-4" /></button>
								</div>
								<div className="flex flex-wrap gap-1 mt-2">
									{tags.map((t, i) => (
										<span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
											{t}
											<button onClick={() => setTags(tags.filter((_, j) => j !== i))} className="hover:text-red-500"><X className="h-3 w-3" /></button>
										</span>
									))}
								</div>
							</div>

							<div>
								<label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" />المواقع</label>
								<div className="flex gap-2">
									<input value={locInput} maxLength={GALLERY_LABEL_MAX} onChange={(e) => setLocInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLoc() } }} placeholder="أضف موقعاً، اضغط Enter" className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
									<button type="button" onClick={addLoc} className="px-2.5 bg-gray-100 rounded-md hover:bg-gray-200"><Plus className="h-4 w-4" /></button>
								</div>
								<div className="flex flex-wrap gap-1 mt-2">
									{locations.map((l, i) => (
										<span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
											{l}
											<button onClick={() => setLocations(locations.filter((_, j) => j !== i))} className="hover:text-red-500"><X className="h-3 w-3" /></button>
										</span>
									))}
								</div>
							</div>

							<div>
								<div className="flex items-center justify-between mb-2">
									<label className="block text-xs font-medium text-gray-500">العنوان والوصف</label>
									<button type="button" onClick={addTranslation} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus className="h-3 w-3" />لغة</button>
								</div>
								<div className="flex gap-1 mb-2 border-b border-gray-200">
									{translations.map((t, i) => (
										<button key={i} type="button" onClick={() => setActiveLang(t.lang)}
											className={`cursor-pointer px-3 py-1.5 text-xs font-medium border-b-2 ${activeLang === t.lang ? "border-primary text-primary" : "border-transparent text-gray-500"}`}>
											{languageLabel(t.lang)}
											{translations.length > 1 && (
												<span onClick={(e) => { e.stopPropagation(); removeTranslation(i) }} className="mr-1 text-gray-400 hover:text-red-500 cursor-pointer"><X className="inline h-3 w-3" /></span>
											)}
										</button>
									))}
								</div>
								{translations.map((t, i) => (
									<div key={i} className={activeLang === t.lang ? "block space-y-2" : "hidden"}>
										<input value={t.title} onChange={(e) => updateT(i, { title: e.target.value })}
											maxLength={500}
											placeholder="العنوان"
											dir={t.lang === "ar" ? "rtl" : "ltr"}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
										<textarea value={t.description} onChange={(e) => updateT(i, { description: e.target.value })}
											maxLength={5000}
											placeholder="وصف الصورة..."
											dir={t.lang === "ar" ? "rtl" : "ltr"}
											rows={3}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />

										<details className="bg-white border border-gray-200 rounded-lg overflow-hidden">
											<summary className="cursor-pointer text-xs font-semibold text-gray-900 select-none px-3 py-2 bg-linear-to-l from-primary/5 to-transparent border-b border-gray-100 flex items-center gap-2">
												<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] font-medium">SEO</span>
												تحسين محركات البحث
											</summary>
											<div className="p-3 space-y-3 bg-white">
												<div>
													<label className="block text-xs font-medium text-gray-500 mb-1">عنوان SEO (meta title)</label>
													<input value={t.meta_title} onChange={(e) => updateT(i, { meta_title: e.target.value })}
														dir={t.lang === "ar" ? "rtl" : "ltr"}
														maxLength={300}
														placeholder="إن تُرك فارغاً، يُستخدم عنوان الصورة"
														className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
												</div>
												<div>
													<label className="block text-xs font-medium text-gray-500 mb-1">وصف SEO (meta description)</label>
													<textarea value={t.meta_description} onChange={(e) => updateT(i, { meta_description: e.target.value })}
														rows={2}
														dir={t.lang === "ar" ? "rtl" : "ltr"}
														maxLength={500}
														placeholder="إن تُرك فارغاً، يُستخدم وصف الصورة"
														className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
												</div>
												<div>
													<label className="block text-xs font-medium text-gray-500 mb-1">صورة المشاركة (og:image)</label>
													<MediaInput value={t.og_image_id ?? undefined} onChange={(id) => updateT(i, { og_image_id: id })} />
												</div>
											</div>
										</details>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>

				<div className="flex justify-between items-center px-6 py-3 border-t border-gray-200 bg-gray-50">
					<button onClick={onDelete} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50">
						<Trash2 className="h-4 w-4" />حذف
					</button>
					<div className="flex gap-2">
						<button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">إلغاء</button>
						<button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50">
							{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}حفظ
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
