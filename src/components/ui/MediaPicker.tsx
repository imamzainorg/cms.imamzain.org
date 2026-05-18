"use client"

import { useEffect, useState, useCallback } from "react"
import { mediaService } from "@/services/media.service"
import type { MediaRecord } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import {
	Image as ImageIcon, Upload, Loader2, Search, X, Check, FileText, Trash2,
} from "lucide-react"

type Props = {
	open: boolean
	onClose: () => void
	onSelect: (media: MediaRecord) => void
	/** Restrict to one of: "image", "any". Defaults to image. */
	accept?: "image" | "any"
	title?: string
}

export default function MediaPicker({
	open,
	onClose,
	onSelect,
	accept = "image",
	title = "اختر ملفاً",
}: Props) {
	const [media, setMedia] = useState<MediaRecord[]>([])
	const [loading, setLoading] = useState(false)
	const [uploading, setUploading] = useState(false)
	const [search, setSearch] = useState("")
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(false)
	const [selected, setSelected] = useState<MediaRecord | null>(null)

	const load = useCallback(async (p: number, replace: boolean) => {
		setLoading(true)
		try {
			const { data } = await mediaService.list({ page: p, limit: 30 })
			setMedia((prev) => (replace ? data.items : [...prev, ...data.items]))
			setHasMore(p < data.pagination.pages)
		} catch (e) {
			toast.error(getErrorMessage(e, "فشل تحميل الوسائط"))
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		if (!open) return
		setSelected(null)
		setSearch("")
		setPage(1)
		load(1, true)
	}, [open, load])

	const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files
		if (!files?.length) return
		setUploading(true)
		try {
			let lastUploaded: MediaRecord | null = null
			for (const file of Array.from(files)) {
				if (accept === "image" && !file.type.startsWith("image/")) {
					toast.error(`${file.name}: ليس صورة`)
					continue
				}
				const record = await mediaService.uploadFile(file)
				lastUploaded = record
			}
			toast.success(`تم رفع ${files.length} ملف${files.length > 1 ? "ات" : ""}`)
			await load(1, true)
			setPage(1)
			if (lastUploaded) setSelected(lastUploaded)
		} catch (err) {
			toast.error(getErrorMessage(err, "فشل الرفع"))
		} finally {
			setUploading(false)
			e.target.value = ""
		}
	}

	const handleDelete = async (e: React.MouseEvent, item: MediaRecord) => {
		e.stopPropagation()
		if (!confirm(`حذف "${item.filename}"؟ سيفشل إذا كان مستخدماً في محتوى.`)) return
		try {
			await mediaService.remove(item.id)
			toast.success("تم الحذف")
			setMedia((prev) => prev.filter((m) => m.id !== item.id))
			if (selected?.id === item.id) setSelected(null)
		} catch (err) {
			toast.error(getErrorMessage(err, "تعذّر الحذف"))
		}
	}

	const filtered = media.filter((m) => {
		const isImage = m.mime_type?.startsWith("image/")
		if (accept === "image" && !isImage) return false
		if (!search) return true
		return (
			m.filename.toLowerCase().includes(search.toLowerCase()) ||
			(m.alt_text || "").toLowerCase().includes(search.toLowerCase())
		)
	})

	if (!open) return null

	return (
		<div
			className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
			onClick={onClose}
		>
			<div
				className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
					<h2 className="text-lg font-semibold text-gray-900">{title}</h2>
					<button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100">
						<X className="h-5 w-5 text-gray-500" />
					</button>
				</div>

				<div className="flex flex-wrap gap-3 px-6 py-3 border-b border-gray-100">
					<div className="relative flex-1 min-w-[200px]">
						<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
						<input
							type="text"
							placeholder="ابحث باسم الملف..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="w-full pr-9 pl-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
						/>
					</div>
					<label
						className={`inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90 cursor-pointer ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
					>
						{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
						{uploading ? "جارٍ الرفع..." : "رفع جديد"}
						<input
							type="file"
							multiple
							accept={accept === "image" ? "image/*" : undefined}
							onChange={handleUpload}
							disabled={uploading}
							className="hidden"
						/>
					</label>
				</div>

				<div className="flex-1 overflow-y-auto p-6 bg-gray-50">
					{filtered.length === 0 && !loading ? (
						<div className="text-center py-16 text-gray-500">
							<ImageIcon className="h-16 w-16 mx-auto mb-3 text-gray-300" />
							<p>{search ? "لا توجد نتائج" : "المكتبة فارغة. ارفع ملفاً للبدء."}</p>
						</div>
					) : (
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
							{filtered.map((item) => {
								const isImage = item.mime_type?.startsWith("image/")
								const isSel = selected?.id === item.id
								return (
									<button
										key={item.id}
										type="button"
										onClick={() => setSelected(item)}
										onDoubleClick={() => onSelect(item)}
										className={`group relative aspect-square bg-white border-2 rounded-lg overflow-hidden text-left transition-all ${isSel ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-gray-300"}`}
									>
										{isImage ? (
											<img
												src={item.url}
												alt={item.alt_text || item.filename}
												className="w-full h-full object-cover"
											/>
										) : (
											<div className="w-full h-full flex flex-col items-center justify-center p-2 bg-gray-50">
												<FileText className="h-10 w-10 text-gray-400" />
												<p className="mt-2 text-[11px] text-gray-600 line-clamp-2 text-center break-all">{item.filename}</p>
											</div>
										)}
										{isSel && (
											<div className="absolute top-1 right-1 bg-primary text-white rounded-full p-1 shadow-md">
												<Check className="h-3 w-3" />
											</div>
										)}
										<div
											onClick={(e) => handleDelete(e, item)}
											className="absolute top-1 left-1 bg-white/90 hover:bg-red-500 hover:text-white text-red-500 rounded p-1 opacity-0 group-hover:opacity-100 cursor-pointer"
											title="حذف"
										>
											<Trash2 className="h-3 w-3" />
										</div>
										{isImage && (
											<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[11px] p-1.5 truncate opacity-0 group-hover:opacity-100">
												{item.filename}
											</div>
										)}
									</button>
								)
							})}
						</div>
					)}
					{loading && (
						<div className="flex items-center justify-center py-6">
							<Loader2 className="h-6 w-6 animate-spin text-primary" />
						</div>
					)}
					{hasMore && !loading && (
						<div className="flex justify-center mt-6">
							<button
								onClick={() => { setPage(page + 1); load(page + 1, false) }}
								className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
							>
								عرض المزيد
							</button>
						</div>
					)}
				</div>

				<div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-white">
					<div className="text-sm text-gray-500">
						{selected
							? <span>المختار: <span className="font-medium text-gray-900">{selected.filename}</span></span>
							: <span>اختر ملفاً (نقر مزدوج للاختيار السريع)</span>}
					</div>
					<div className="flex gap-2">
						<button
							onClick={onClose}
							className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
						>
							إلغاء
						</button>
						<button
							onClick={() => selected && onSelect(selected)}
							disabled={!selected}
							className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-40"
						>
							اختيار
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
