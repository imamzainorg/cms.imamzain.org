"use client"

import { useRef, useState } from "react"
import type { EmbeddedMedia, MediaRecord } from "@/types"
import { mediaService } from "@/services/media.service"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import MediaPicker from "./MediaPicker"
import { ArrowUp, ArrowDown, FileText, Library, Loader2, Upload, X } from "lucide-react"

export type AttachmentItem = Pick<EmbeddedMedia, "id" | "url"> & {
	filename?: string
	mime_type?: string
}

type Props = {
	value: AttachmentItem[]
	onChange: (items: AttachmentItem[]) => void
	/** When both are given, each image attachment gets an "add to gallery" tick. */
	galleryIds?: string[]
	onGalleryChange?: (ids: string[]) => void
}

/**
 * Ordered list of a post's attachments: view, add, reorder and remove.
 * The order here is the order the public site shows them in.
 */
export default function AttachmentsInput({ value, onChange, galleryIds, onGalleryChange }: Props) {
	const [open, setOpen] = useState(false)
	const [uploading, setUploading] = useState(false)
	const [dragging, setDragging] = useState(false)
	const fileRef = useRef<HTMLInputElement>(null)

	const toItem = (m: MediaRecord): AttachmentItem => ({ id: m.id, url: m.url, filename: m.filename, mime_type: m.mime_type })

	// Uploads straight to the media library, then attaches every file that succeeded.
	const uploadFiles = async (files: File[]) => {
		if (!files.length) return
		setUploading(true)
		let next = [...value]
		let ok = 0
		for (const file of files) {
			try {
				const record = await mediaService.uploadFile(file)
				if (!next.some((a) => a.id === record.id)) next = [...next, toItem(record)]
				ok++
				onChange(next)
			} catch (err) {
				toast.error(`${file.name}: ${getErrorMessage(err, "فشل الرفع")}`)
			}
		}
		setUploading(false)
		if (ok) toast.success(`تم رفع ${ok} ملف${ok > 1 ? "ات" : ""}`)
	}

	const move = (from: number, to: number) => {
		if (to < 0 || to >= value.length) return
		const next = [...value]
		const [item] = next.splice(from, 1)
		next.splice(to, 0, item)
		onChange(next)
	}

	const add = (m: MediaRecord) => {
		setOpen(false)
		if (value.some((a) => a.id === m.id)) return
		onChange([...value, toItem(m)])
	}

	return (
		<div className="space-y-2">
			{value.length === 0 ? (
				<p className="text-xs text-gray-500">لا توجد مرفقات.</p>
			) : (
				<ul className="space-y-2">
					{value.map((a, i) => {
						const isImage = a.mime_type?.startsWith("image/")
						return (
							<li key={a.id} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg bg-white">
								<div className="w-12 h-12 shrink-0 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
									{isImage
										? <img src={a.url} alt={a.filename ?? ""} className="w-full h-full object-cover" />
										: <FileText className="h-6 w-6 text-gray-400" />}
								</div>
								<div className="flex-1 min-w-0">
										<p className="text-xs text-gray-800 truncate">{a.filename ?? a.id}</p>
										{isImage && galleryIds && onGalleryChange && (
											<label className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer">
												<input
													type="checkbox"
													checked={galleryIds.includes(a.id)}
													onChange={(e) => onGalleryChange(e.target.checked ? [...galleryIds, a.id] : galleryIds.filter((x) => x !== a.id))}
													className="h-3.5 w-3.5 text-primary rounded"
												/>
												إضافة إلى معرض الصور
											</label>
										)}
									</div>
								<div className="flex items-center shrink-0">
									<button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="نقل لأعلى"
										className="cursor-pointer p-1 text-gray-500 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
										<ArrowUp className="h-4 w-4" strokeWidth={1.6} />
									</button>
									<button type="button" onClick={() => move(i, i + 1)} disabled={i === value.length - 1} aria-label="نقل لأسفل"
										className="cursor-pointer p-1 text-gray-500 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
										<ArrowDown className="h-4 w-4" strokeWidth={1.6} />
									</button>
									<button type="button" onClick={() => { onChange(value.filter((x) => x.id !== a.id)); onGalleryChange?.(galleryIds?.filter((x) => x !== a.id) ?? []) }} aria-label="إزالة المرفق"
										className="cursor-pointer p-1 text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-soft))] rounded-md">
										<X className="h-4 w-4" strokeWidth={1.6} />
									</button>
								</div>
							</li>
						)
					})}
				</ul>
			)}

			<div
				onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
				onDragLeave={() => setDragging(false)}
				onDrop={(e) => { e.preventDefault(); setDragging(false); if (!uploading) uploadFiles(Array.from(e.dataTransfer.files)) }}
				className={`rounded-lg border-2 border-dashed p-3 space-y-2 transition-colors ${dragging ? "border-primary bg-primary/5" : "border-gray-300"}`}
			>
				<p className="text-xs text-gray-500 text-center">اسحب الملفات هنا أو استخدم الأزرار</p>
				<div className="flex gap-2">
					<button
						type="button"
						disabled={uploading}
						onClick={() => fileRef.current?.click()}
						className="cursor-pointer flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-[hsl(var(--primary)/0.92)] disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{uploading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} /> : <Upload className="h-4 w-4" strokeWidth={1.6} />}
						{uploading ? "جارٍ الرفع..." : "رفع ملفات"}
					</button>
					<button
						type="button"
						disabled={uploading}
						onClick={() => setOpen(true)}
						className="cursor-pointer flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-primary border border-[hsl(var(--primary)/0.4)] rounded-md hover:bg-[hsl(var(--primary)/0.06)] disabled:opacity-50"
					>
						<Library className="h-4 w-4" strokeWidth={1.6} /> من المكتبة
					</button>
				</div>
				<input
					ref={fileRef}
					type="file"
					multiple
					className="hidden"
					onChange={(e) => { uploadFiles(Array.from(e.target.files ?? [])); e.target.value = "" }}
				/>
			</div>

			<MediaPicker
				open={open}
				accept="any"
				title="اختر مرفقاً"
				onClose={() => setOpen(false)}
				onSelect={add}
			/>
		</div>
	)
}
