"use client"

import { Trash2 } from "lucide-react"
import { galleryService } from "@/services/gallery.service"
import { queryKeys } from "@/lib/queries/keys"
import type { GalleryImage } from "@/types"
import TrashList from "@/components/trash/TrashList"

export default function GalleryTrashPage() {
	return (
		<TrashList<GalleryImage>
			title="سلة المهملات — معرض الصور"
			description="الصور المحذوفة من المعرض. الملفات الأصلية تبقى في مكتبة الوسائط."
			singular="الصورة"
			icon={Trash2}
			backHref="/dashboard/gallery"
			backLabel="العودة إلى المعرض"
			resource="gallery"
			rootKey={queryKeys.gallery.all}
			service={{ trash: galleryService.trash, restore: galleryService.restore }}
			// Gallery items are keyed by media_id (no separate id column).
			getId={(g) => g.media_id}
			getCreatedAt={(g) => g.created_at}
			getLabel={(g) =>
				g.translation?.title ??
				g.gallery_image_translations?.find((t) => t.lang === "ar")?.title ??
				g.gallery_image_translations?.[0]?.title ??
				"بدون عنوان"
			}
			getThumbnailUrl={(g) => g.media?.url ?? null}
		/>
	)
}
