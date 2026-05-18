"use client"

import { useEffect, useState } from "react"
import { mediaService } from "@/services/media.service"
import type { MediaRecord } from "@/types"
import MediaPicker from "./MediaPicker"
import { Image as ImageIcon, Pencil, X } from "lucide-react"

type Props = {
	value?: string | null
	onChange: (mediaId: string | null) => void
	label?: string
	required?: boolean
	error?: string
	/** Whether to allow non-image files. */
	accept?: "image" | "any"
	className?: string
}

/**
 * Replaces "raw UUID" inputs in forms with a thumbnail-aware picker.
 * The user sees a preview + "change" button; the underlying form value is the media UUID.
 */
export default function MediaInput({
	value,
	onChange,
	label,
	required,
	error,
	accept = "image",
	className = "",
}: Props) {
	const [open, setOpen] = useState(false)
	const [record, setRecord] = useState<MediaRecord | null>(null)
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		if (!value) { setRecord(null); return }
		if (record?.id === value) return
		setLoading(true)
		mediaService.get(value)
			.then(({ data }) => setRecord(data))
			.catch(() => setRecord(null))
			.finally(() => setLoading(false))
	}, [value, record?.id])

	const isImage = record?.mime_type?.startsWith("image/")

	return (
		<div className={className}>
			{label && (
				<label className="block text-sm font-medium text-gray-700 mb-1">
					{label}{required && <span className="text-red-500"> *</span>}
				</label>
			)}

			{value && record ? (
				<div className="flex items-stretch gap-3 p-3 border border-gray-200 rounded-lg bg-white">
					<div className="w-20 h-20 shrink-0 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
						{loading
							? <div className="text-xs text-gray-400">...</div>
							: isImage
								? <img src={record.url} alt={record.alt_text || record.filename} className="w-full h-full object-cover" />
								: <ImageIcon className="h-8 w-8 text-gray-300" />
						}
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-sm font-medium text-gray-900 truncate">{record.filename}</p>
						{record.alt_text && <p className="text-xs text-gray-500 truncate mt-0.5">{record.alt_text}</p>}
						<div className="flex gap-2 mt-2">
							<button
								type="button"
								onClick={() => setOpen(true)}
								className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary border border-primary rounded-md hover:bg-primary/5"
							>
								<Pencil className="h-3 w-3" /> تغيير
							</button>
							<button
								type="button"
								onClick={() => onChange(null)}
								className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 hover:text-red-700"
							>
								<X className="h-3 w-3" /> إزالة
							</button>
						</div>
					</div>
				</div>
			) : (
				<button
					type="button"
					onClick={() => setOpen(true)}
					className={`w-full flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-lg transition-colors ${error ? "border-red-300 bg-red-50/30" : "border-gray-300 hover:border-primary hover:bg-primary/5"}`}
				>
					<ImageIcon className="h-8 w-8 text-gray-400" />
					<span className="text-sm font-medium text-gray-700">
						{accept === "image" ? "اختر صورة من المكتبة أو ارفع جديدة" : "اختر ملفاً من المكتبة أو ارفع جديداً"}
					</span>
				</button>
			)}

			{error && <p className="mt-1 text-sm text-red-600">{error}</p>}

			<MediaPicker
				open={open}
				accept={accept}
				onClose={() => setOpen(false)}
				onSelect={(m) => {
					setRecord(m)
					onChange(m.id)
					setOpen(false)
				}}
			/>
		</div>
	)
}
