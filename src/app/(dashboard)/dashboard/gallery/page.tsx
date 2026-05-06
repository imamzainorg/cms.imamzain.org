"use client"

import { useEffect, useState, useCallback } from "react"
import { mediaService } from "@/services/media.service"
import { galleryService } from "@/services/gallery.service"
import type { GalleryImage } from "@/types"
import { toast } from "sonner"
import { Upload, Trash2, Copy, ImageIcon, Loader2, Search, X } from "lucide-react"

export default function GalleryPage() {
	const [images, setImages] = useState<GalleryImage[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isUploading, setIsUploading] = useState(false)
	const [searchQuery, setSearchQuery] = useState("")
	const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)

	useEffect(() => { loadImages() }, [])

	const loadImages = async () => {
		try {
			const { data } = await galleryService.list({ limit: 100 })
			setImages(data.items ?? [])
		} catch { toast.error("فشل تحميل المعرض") }
		finally { setIsLoading(false) }
	}

	const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files
		if (!files?.length) return
		setIsUploading(true)
		try {
			for (const file of Array.from(files)) {
				const media = await mediaService.uploadFile(file)
				await galleryService.create({ media_id: media.id })
			}
			toast.success(`تم رفع ${files.length} صورة`)
			loadImages()
		} catch { toast.error("فشل الرفع") }
		finally { setIsUploading(false); e.target.value = "" }
	}, [])

	const handleDelete = async (id: string) => {
		if (!confirm("هل تريد حذف هذه الصورة؟")) return
		try {
			await galleryService.remove(id)
			toast.success("تم حذف الصورة")
			setSelectedImage(null)
			loadImages()
		} catch { toast.error("فشل حذف الصورة") }
	}

	const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("تم النسخ") }

	const getTitle = (img: GalleryImage) =>
		(img.gallery_image_translations ?? []).find((t) => t.is_default)?.title ||
		(img.gallery_image_translations ?? [])[0]?.title ||
		""

	const filtered = images.filter((img) => {
		const title = getTitle(img).toLowerCase()
		const q = searchQuery.toLowerCase()
		return !q || title.includes(q) || (img.id && img.id.includes(q))
	})

	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

	return (
		<div>
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
				<h1 className="text-3xl font-bold text-gray-900">معرض الصور</h1>
				<label className={`inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 cursor-pointer ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}>
					{isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
					{isUploading ? "جارٍ الرفع..." : "رفع صور"}
					<input type="file" multiple accept="image/*" onChange={handleUpload} disabled={isUploading} className="hidden" />
				</label>
			</div>

			<div className="relative mb-6">
				<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
				<input type="text" placeholder="ابحث عن صورة..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
					className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
			</div>

			{filtered.length === 0 ? (
				<div className="text-center py-16 bg-white rounded-lg">
					<ImageIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
					<p className="text-gray-500 text-lg">{searchQuery ? "لا توجد صور تطابق البحث" : "لا توجد صور مرفوعة بعد"}</p>
				</div>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
					{filtered.map((image, idx) => (
						<div key={image.id ?? idx} onClick={() => setSelectedImage(image)}
							className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary">
							{image.image_url ? (
								<img src={image.image_url} alt={getTitle(image)} className="w-full h-full object-cover" />
							) : (
								<div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-10 w-10 text-gray-300" /></div>
							)}
							<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
								<button onClick={(e) => { e.stopPropagation(); if (image.id) copy(image.id) }} className="p-2 bg-white rounded-full hover:bg-gray-100" title="نسخ المعرّف"><Copy className="h-4 w-4 text-gray-700" /></button>
								<button onClick={(e) => { e.stopPropagation(); handleDelete(image.id) }} className="p-2 bg-white rounded-full hover:bg-red-50" title="حذف"><Trash2 className="h-4 w-4 text-red-600" /></button>
							</div>
						</div>
					))}
				</div>
			)}

			{selectedImage && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedImage(null)}>
					<div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
						<div className="p-6">
							<div className="flex justify-between items-start mb-4">
								<h2 className="text-xl font-semibold text-gray-900">تفاصيل الصورة</h2>
								<button onClick={() => setSelectedImage(null)} className="p-1 hover:bg-gray-100 rounded-full"><X className="h-5 w-5 text-gray-500" /></button>
							</div>
							{selectedImage.image_url ? (
								<img src={selectedImage.image_url} alt={getTitle(selectedImage)} className="w-full rounded-lg mb-4" />
							) : (
								<div className="w-full h-48 bg-gray-100 rounded-lg mb-4 flex items-center justify-center"><ImageIcon className="h-16 w-16 text-gray-300" /></div>
							)}
							<div className="space-y-3">
								{getTitle(selectedImage) && (
									<div><label className="text-sm font-medium text-gray-500">العنوان</label><p className="text-sm text-gray-900">{getTitle(selectedImage)}</p></div>
								)}
								<div>
									<label className="text-sm font-medium text-gray-500">معرّف الصورة</label>
									<div className="flex items-center gap-2 mt-1">
										<code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono truncate">{selectedImage.id || "—"}</code>
										{selectedImage.id && <button onClick={() => copy(selectedImage.id)} className="p-2 text-primary hover:bg-primary/5 rounded"><Copy className="h-4 w-4" /></button>}
									</div>
								</div>
								{selectedImage.image_url && (
									<div>
										<label className="text-sm font-medium text-gray-500">رابط الصورة</label>
										<div className="flex items-center gap-2 mt-1">
											<code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono truncate">{selectedImage.image_url}</code>
											<button onClick={() => copy(selectedImage.image_url!)} className="p-2 text-primary hover:bg-primary/5 rounded"><Copy className="h-4 w-4" /></button>
										</div>
									</div>
								)}
								<div className="pt-4 flex gap-2">
									{selectedImage.image_url && <a href={selectedImage.image_url} target="_blank" rel="noreferrer" className="flex-1 px-4 py-2 bg-primary text-white text-center rounded-md hover:bg-primary/90">عرض الحجم الكامل</a>}
									<button onClick={() => handleDelete(selectedImage.id)} className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
