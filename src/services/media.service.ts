import { api } from "@/lib/api"
import type { MediaRecord } from "@/types"

export const mediaService = {
	list: (params?: { page?: number; limit?: number }) =>
		api.get<{ media: MediaRecord[]; total: number }>("/media", { params }),

	get: (id: string) => api.get<MediaRecord>(`/media/${id}`),

	requestUploadUrl: (filename: string, mime_type: string) =>
		api.post<{ uploadUrl: string; key: string }>("/media/upload-url", { filename, mime_type }),

	confirmUpload: (body: {
		key: string
		filename: string
		mime_type: string
		file_size: number
		alt_text?: string
		width?: number
		height?: number
	}) => api.post<MediaRecord>("/media/confirm", body),

	update: (id: string, body: Partial<{ filename: string; alt_text: string; mime_type: string; file_size: number; width: number; height: number }>) =>
		api.patch<MediaRecord>(`/media/${id}`, body),

	remove: (id: string) => api.delete(`/media/${id}`),

	uploadFile: async (file: File): Promise<MediaRecord> => {
		const { data: urlData } = await api.post<{ uploadUrl: string; key: string }>(
			"/media/upload-url",
			{ filename: file.name, mime_type: file.type }
		)

		await fetch(urlData.uploadUrl, {
			method: "PUT",
			body: file,
			headers: { "Content-Type": file.type },
		})

		const dimensions = await getImageDimensions(file)

		const { data: record } = await api.post<MediaRecord>("/media/confirm", {
			key: urlData.key,
			filename: file.name,
			mime_type: file.type,
			file_size: file.size,
			...dimensions,
		})

		return record
	},
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
	return new Promise((resolve) => {
		if (typeof window === "undefined") { resolve({ width: 0, height: 0 }); return }
		const timeoutId = setTimeout(() => resolve({ width: 0, height: 0 }), 500)
		const img = new Image()
		const url = URL.createObjectURL(file)
		img.onload = () => {
			clearTimeout(timeoutId)
			resolve({ width: img.naturalWidth, height: img.naturalHeight })
			URL.revokeObjectURL(url)
		}
		img.onerror = () => {
			clearTimeout(timeoutId)
			resolve({ width: 0, height: 0 })
			URL.revokeObjectURL(url)
		}
		img.src = url
	})
}