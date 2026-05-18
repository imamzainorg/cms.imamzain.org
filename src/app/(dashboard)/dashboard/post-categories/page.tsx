"use client"

import CategoryManager from "@/components/categories/CategoryManager"
import { postCategoriesService } from "@/services/post-categories.service"
import { queryKeys } from "@/lib/queries/keys"
import type { PostCategory } from "@/types"

export default function PostCategoriesPage() {
	return (
		<CategoryManager<PostCategory>
			title="تصنيفات المقالات"
			singular="تصنيف"
			service={postCategoriesService}
			queryKey={queryKeys.postCategories.all}
			translationsField="post_category_translations"
			trashHref="/dashboard/post-categories/trash"
		/>
	)
}
