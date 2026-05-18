"use client"

import { useEffect, useState } from "react"
import type { MediaRecord } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import Pagination from "@/components/ui/Pagination"
import EmptyState from "@/components/ui/EmptyState"
import Modal from "@/components/ui/Modal"
import PageHeader from "@/components/layout/PageHeader"
import { CardGridSkeleton, TableSkeleton } from "@/components/ui/Skeleton"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { humanizeMime, humanizeFileSize } from "@/lib/humanize"
import {
	Copy, Trash2, Loader2, Image as ImageIcon, Search, Upload, Pencil, Save,
	FileText, Grid3x3, List as ListIcon, Download, Library, RefreshCw,
} from "lucide-react"
import { format } from "date-fns"
import {
	useMediaList,
	useUploadMedia,
	useUpdateMedia,
	useDeleteMedia,
	useRegenerateVariants,
} from "@/lib/queries/media"

type ViewMode = "grid" | "list"

const MIME_FILTERS = [
	{ label: "كل الأنواع", value: "" },
	{ label: "JPEG", value: "image/jpeg" },
	{ label: "PNG", value: "image/png" },
	{ label: "WebP", value: "image/webp" },
	{ label: "GIF", value: "image/gif" },
] as const

/**
 * Media library. Server-side search + mime filter (no client-side full-scan).
 * Trigram-indexed substring match on filename + alt_text per API docs.
 */
export default function MediaPage() {
	const [page, setPage] = useState(1)
	const [limit, setLimit] = useState(50)
	const [search, setSearch] = useState("")
	const [debouncedSearch, setDebouncedSearch] = useState("")
	const [mimeType, setMimeType] = useState("")
	const [view, setView] = useState<ViewMode>("grid")
	const [editing, setEditing] = useState<MediaRecord | null>(null)
	const { confirm, dialog } = useConfirm()

	useEffect(() => {
		const t = setTimeout(() => {
			setDebouncedSearch(search.trim())
			setPage(1)
		}, 300)
		return () => clearTimeout(t)
	}, [search])

	const onLimitChange = (n: number) => { setLimit(n); setPage(1) }
	const onMimeChange = (v: string) => { setMimeType(v); setPage(1) }

	const listQuery = useMediaList({
		page,
		limit,
		search: debouncedSearch || undefined,
		mime_type: mimeType || undefined,
	})
	const media = listQuery.data?.items ?? []
	const total = listQuery.data?.pagination.total ?? 0
	const pages = listQuery.data?.pagination.pages ?? 1
	const loading = listQuery.isLoading
	const fetching = listQuery.isFetching

	const uploadMedia = useUploadMedia()
	const updateMediaMutation = useUpdateMedia()
	const deleteMediaMutation = useDeleteMedia()
	const regenerateVariants = useRegenerateVariants()
	const uploading = uploadMedia.isPending

	useEffect(() => {
		if (listQuery.error) toast.error(getErrorMessage(listQuery.error, "فشل تحميل الوسائط"))
	}, [listQuery.error])

	const handleDelete = async (item: MediaRecord) => {
		const ok = await confirm({
			title: `حذف "${item.filename}"؟`,
			description: "سيفشل الحذف إذا كان الملف مستخدماً في محتوى منشور. لا يمكن التراجع.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		deleteMediaMutation.mutate(item.id, {
			onSuccess: () => { toast.success("تم الحذف"); setEditing(null) },
			onError: (e) => toast.error(getErrorMessage(e, "تعذّر الحذف — قد يكون مستخدماً في محتوى")),
		})
	}

	const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files
		if (!files?.length) return
		try {
			for (const file of Array.from(files)) {
				await uploadMedia.mutateAsync(file)
			}
			toast.success(`تم رفع ${files.length} ملف${files.length > 1 ? "ات" : ""}`)
			setPage(1)
		} catch (err) {
			toast.error(getErrorMessage(err, "فشل الرفع"))
		} finally {
			e.target.value = ""
		}
	}

	const updateMedia = (id: string, patch: { filename?: string; alt_text?: string }) =>
		new Promise<void>((resolve) => {
			updateMediaMutation.mutate(
				{ id, body: patch },
				{
					onSuccess: () => { toast.success("تم التحديث"); setEditing(null); resolve() },
					onError: (e) => { toast.error(getErrorMessage(e, "فشل التحديث")); resolve() },
				},
			)
		})

	const handleRegenerate = (m: MediaRecord) => {
		regenerateVariants.mutate(m.id, {
			onSuccess: () => toast.success("تم إعادة توليد المتغيّرات"),
			onError: (e) => toast.error(getErrorMessage(e, "تعذّر إعادة التوليد")),
		})
	}

	const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("تم نسخ الرابط") }

	const hasFilters = !!debouncedSearch || !!mimeType

	return (
		<div className="space-y-6">
			<PageHeader
				title="مكتبة الوسائط"
				description="كل الصور والملفات المرفوعة. كل صورة تُولَّد لها متغيّرات WebP (320/768/1280/1920) تلقائياً عند الرفع."
				icon={Library}
				actions={
					<label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 shadow-sm transition-colors ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}>
						{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
						{uploading ? "جارٍ الرفع..." : "رفع ملفات"}
						<input type="file" multiple onChange={handleUpload} disabled={uploading} className="hidden" />
					</label>
				}
			/>

			<div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
				<div className="relative flex-1 min-w-50">
					<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
					<input
						type="text" placeholder="ابحث باسم الملف أو النص البديل..."
						value={search} onChange={(e) => setSearch(e.target.value)}
						className="w-full pr-9 pl-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
					/>
					{fetching && !loading && (
						<Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
					)}
				</div>
				<select value={mimeType} onChange={(e) => onMimeChange(e.target.value)} className="cursor-pointer px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary">
					{MIME_FILTERS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
				</select>
				<div className="flex gap-1 bg-gray-100 rounded-md p-1">
					<button onClick={() => setView("grid")} className={`cursor-pointer p-1.5 rounded transition-colors ${view === "grid" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-900"}`} title="شبكة"><Grid3x3 className="h-4 w-4" /></button>
					<button onClick={() => setView("list")} className={`cursor-pointer p-1.5 rounded transition-colors ${view === "list" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-900"}`} title="قائمة"><ListIcon className="h-4 w-4" /></button>
				</div>
			</div>

			{loading ? (
				view === "grid" ? (
					<CardGridSkeleton count={18} aspect="aspect-square" />
				) : (
					<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
						<table className="min-w-full"><tbody className="divide-y divide-gray-100"><TableSkeleton rows={8} cols={8} /></tbody></table>
					</div>
				)
			) : media.length === 0 ? (
				<EmptyState
					variant="card"
					icon={ImageIcon}
					title={hasFilters ? "لا توجد نتائج" : "المكتبة فارغة"}
					description={hasFilters ? "جرّب كلمات بحث مختلفة أو نوعاً آخر." : "ارفع صوراً وملفات لتستخدمها داخل المقالات والمحتوى."}
					action={!hasFilters && (
						<label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90">
							<Upload className="h-4 w-4" />ارفع أول ملف
							<input type="file" multiple onChange={handleUpload} disabled={uploading} className="hidden" />
						</label>
					)}
				/>
			) : view === "grid" ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
					{media.map((m) => {
						const isImage = m.mime_type?.startsWith("image/")
						const variantsBroken = isImage && m.variants && m.variants.length === 0
						return (
							<div
								key={m.id}
								className="group relative aspect-square bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-primary hover:shadow-md transition-all"
								onClick={() => setEditing(m)}
							>
								{isImage ? (
									<img src={m.url} alt={m.alt_text || m.filename} className="w-full h-full object-cover" />
								) : (
									<div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 p-2">
										<FileText className="h-10 w-10 text-gray-400" />
										<p className="mt-1 text-[10px] text-gray-600 truncate w-full text-center">{humanizeMime(m.mime_type)}</p>
									</div>
								)}
								{variantsBroken && (
									<span className="absolute top-1 right-1 text-[10px] bg-amber-500/95 text-white px-1.5 py-0.5 rounded-full">
										بدون متغيّرات
									</span>
								)}
								<div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/40 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
									<p className="text-white text-[11px] truncate">{m.filename}</p>
									<p className="text-white/70 text-[10px]">{humanizeFileSize(m.file_size)}</p>
								</div>
							</div>
						)
					})}
				</div>
			) : (
				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">معاينة</th>
								<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الملف</th>
								<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
								<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحجم</th>
								<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الأبعاد</th>
								<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">متغيّرات</th>
								<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الرفع</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">إجراءات</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-100">
							{media.map((m) => {
								const isImage = m.mime_type?.startsWith("image/")
								const variantsCount = m.variants?.length ?? 0
								return (
									<tr key={m.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setEditing(m)}>
										<td className="px-4 py-2.5">
											<div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
												{isImage
													? <img src={m.url} alt="" className="w-full h-full object-cover" />
													: <FileText className="h-5 w-5 text-gray-400" />}
											</div>
										</td>
										<td className="px-4 py-2.5">
											<p className="text-sm font-medium text-gray-900 truncate max-w-xs">{m.filename}</p>
											{m.alt_text && <p className="text-xs text-gray-500 truncate max-w-xs">{m.alt_text}</p>}
										</td>
										<td className="px-4 py-2.5 text-sm text-gray-700">{humanizeMime(m.mime_type)}</td>
										<td className="px-4 py-2.5 text-sm text-gray-500">{humanizeFileSize(m.file_size)}</td>
										<td className="px-4 py-2.5 text-sm text-gray-500">{m.width && m.height ? `${m.width}×${m.height}` : "—"}</td>
										<td className="px-4 py-2.5 text-sm">
											{isImage ? (
												variantsCount > 0 ? (
													<span className="text-green-700 text-xs">{variantsCount} متغيّرات</span>
												) : (
													<span className="text-amber-600 text-xs">بدون</span>
												)
											) : "—"}
										</td>
										<td className="px-4 py-2.5 text-sm text-gray-500">{m.created_at ? format(new Date(m.created_at), "dd/MM/yyyy") : "—"}</td>
										<td className="px-4 py-2.5 text-left" onClick={(e) => e.stopPropagation()}>
											<div className="flex justify-end gap-1">
												<button onClick={() => setEditing(m)} className="cursor-pointer p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded" title="تعديل"><Pencil className="h-4 w-4" /></button>
												<button onClick={() => copy(m.url)} className="cursor-pointer p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded" title="نسخ الرابط"><Copy className="h-4 w-4" /></button>
												<a href={m.url} download={m.filename} target="_blank" rel="noreferrer" className="cursor-pointer p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded" title="تنزيل"><Download className="h-4 w-4" /></a>
												<button onClick={() => handleDelete(m)} className="cursor-pointer p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="حذف"><Trash2 className="h-4 w-4" /></button>
											</div>
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			)}

			<Pagination
				page={page} pages={pages} total={total} limit={limit}
				pageSizes={[20, 50, 100]}
				onPage={setPage}
				onLimit={onLimitChange}
			/>

			{editing && (
				<MediaEditDialog
					media={editing}
					onClose={() => setEditing(null)}
					onSave={(patch) => updateMedia(editing.id, patch)}
					onDelete={() => handleDelete(editing)}
					onCopy={copy}
					onRegenerate={() => handleRegenerate(editing)}
					regenerating={regenerateVariants.isPending}
				/>
			)}
			{dialog}
		</div>
	)
}

function MediaEditDialog({
	media, onClose, onSave, onDelete, onCopy, onRegenerate, regenerating,
}: {
	media: MediaRecord
	onClose: () => void
	onSave: (patch: { filename?: string; alt_text?: string }) => Promise<void>
	onDelete: () => void
	onCopy: (s: string) => void
	onRegenerate: () => void
	regenerating: boolean
}) {
	const [filename, setFilename] = useState(media.filename)
	const [altText, setAltText] = useState(media.alt_text ?? "")
	const [saving, setSaving] = useState(false)
	const isImage = media.mime_type?.startsWith("image/")
	const variantsCount = media.variants?.length ?? 0
	const variantsBroken = isImage && variantsCount === 0

	useEffect(() => {
		setFilename(media.filename)
		setAltText(media.alt_text ?? "")
	}, [media.id, media.filename, media.alt_text])

	const handleSave = async () => {
		setSaving(true)
		try {
			await onSave({
				filename: filename !== media.filename ? filename : undefined,
				alt_text: altText !== (media.alt_text ?? "") ? altText : undefined,
			})
		} finally { setSaving(false) }
	}

	return (
		<Modal
			open={true}
			onClose={onClose}
			title="تعديل الملف"
			size="xl"
			footer={
				<div className="flex w-full items-center justify-between">
					<button onClick={onDelete} className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50">
						<Trash2 className="h-4 w-4" />حذف
					</button>
					<div className="flex gap-2">
						<button onClick={onClose} className="cursor-pointer px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">إلغاء</button>
						<button onClick={handleSave} disabled={saving} className="cursor-pointer inline-flex items-center gap-2 px-5 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50">
							{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}حفظ
						</button>
					</div>
				</div>
			}
		>
			<div className="grid grid-cols-1 md:grid-cols-5">
				<div className="md:col-span-3 bg-gray-900 flex items-center justify-center min-h-96 md:min-h-[70vh] relative">
					{isImage ? (
						<img src={media.url} alt={altText || filename} className="max-w-full max-h-[75vh] object-contain" />
					) : (
						<div className="text-center text-white p-8">
							<FileText className="h-20 w-20 mx-auto mb-3 text-gray-500" />
							<p className="text-base">{humanizeMime(media.mime_type)}</p>
						</div>
					)}
					{media.width && media.height && (
						<span className="absolute bottom-3 left-3 bg-black/70 text-white text-sm px-3 py-1.5 rounded-md">
							{media.width}×{media.height}
						</span>
					)}
				</div>

				<div className="md:col-span-2 p-6 space-y-4">
					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">اسم الملف</label>
						<input value={filename} onChange={(e) => setFilename(e.target.value)} dir="ltr"
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
					</div>
					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">النص البديل (Alt)</label>
						<textarea value={altText} onChange={(e) => setAltText(e.target.value)} rows={3}
							placeholder="وصف يظهر للقارئ بدلاً من الصورة. مهمّ لمحركات البحث وللوصول."
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
					</div>
					<div className="grid grid-cols-2 gap-3 pt-2">
						<div>
							<label className="block text-xs font-medium text-gray-500 mb-1">النوع</label>
							<p className="text-sm text-gray-700">{humanizeMime(media.mime_type)}</p>
						</div>
						<div>
							<label className="block text-xs font-medium text-gray-500 mb-1">الحجم</label>
							<p className="text-sm text-gray-700">{humanizeFileSize(media.file_size)}</p>
						</div>
						<div className="col-span-2">
							<label className="block text-xs font-medium text-gray-500 mb-1">الرابط</label>
							<div className="flex gap-2">
								<code className="flex-1 px-3 py-2 bg-gray-100 rounded text-xs font-mono truncate" dir="ltr">{media.url}</code>
								<button onClick={() => onCopy(media.url)} className="cursor-pointer p-2 text-primary hover:bg-primary/5 rounded" title="نسخ"><Copy className="h-4 w-4" /></button>
							</div>
						</div>
						{isImage && (
							<div className="col-span-2 border-t border-gray-100 pt-3">
								<label className="block text-xs font-medium text-gray-500 mb-2">
									متغيّرات WebP (للعرض على الموقع العام)
								</label>
								{variantsBroken ? (
									<div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-md p-3">
										<p className="text-xs text-amber-800">
											فشل توليد المتغيّرات. اضغط لإعادة المحاولة.
										</p>
										<button
											onClick={onRegenerate}
											disabled={regenerating}
											className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
										>
											{regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
											إعادة توليد
										</button>
									</div>
								) : (
									<div className="flex flex-wrap gap-1.5">
										{media.variants!.map((v) => (
											<span key={v.width} className="px-2 py-0.5 bg-green-50 text-green-800 text-xs rounded-full">
												{v.width}px · {humanizeFileSize(v.file_size)}
											</span>
										))}
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</Modal>
	)
}
