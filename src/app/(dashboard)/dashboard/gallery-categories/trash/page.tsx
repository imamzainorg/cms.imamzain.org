"use client"

import { Trash2 } from "lucide-react"
import { galleryCategoriesService } from "@/services/gallery-categories.service"
import { queryKeys } from "@/lib/queries/keys"
import { categoryName } from "@/lib/i18n"
import type { GalleryCategory } from "@/types"
import TrashList from "@/components/trash/TrashList"

export default function GalleryCategoriesTrashPage() {
	return (
		<TrashList<GalleryCategory>
			title="سلة المهملات — تصنيفات المعرض"
			description="التصنيفات المحذوفة. الروابط المختصرة تُستعاد إن لم تكن مأخوذة."
			singular="التصنيف"
			icon={Trash2}
			backHref="/dashboard/gallery-categories"
			backLabel="العودة إلى التصنيفات"
			resource="gallery-categories"
			rootKey={queryKeys.galleryCategories.all}
			service={{ trash: galleryCategoriesService.trash, restore: galleryCategoriesService.restore }}
			getId={(c) => c.id}
			getCreatedAt={(c) => c.created_at}
			getLabel={(c) => categoryName(c.gallery_category_translations, c.translation)}
			getSubtitle={(c) => `${c.gallery_category_translations?.length ?? 0} ترجمة`}
		/>
	)
}
