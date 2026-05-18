"use client"

import CategoryManager from "@/components/categories/CategoryManager"
import { galleryCategoriesService } from "@/services/gallery-categories.service"
import { queryKeys } from "@/lib/queries/keys"
import type { GalleryCategory } from "@/types"

export default function GalleryCategoriesPage() {
	return (
		<CategoryManager<GalleryCategory>
			title="تصنيفات المعرض"
			singular="تصنيف"
			service={galleryCategoriesService}
			queryKey={queryKeys.galleryCategories.all}
			translationsField="gallery_category_translations"
			trashHref="/dashboard/gallery-categories/trash"
		/>
	)
}
