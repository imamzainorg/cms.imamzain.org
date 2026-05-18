"use client"

import { Trash2 } from "lucide-react"
import { postCategoriesService } from "@/services/post-categories.service"
import { queryKeys } from "@/lib/queries/keys"
import { categoryName } from "@/lib/i18n"
import type { PostCategory } from "@/types"
import TrashList from "@/components/trash/TrashList"

export default function PostCategoriesTrashPage() {
	return (
		<TrashList<PostCategory>
			title="سلة المهملات — تصنيفات المقالات"
			description="التصنيفات المحذوفة. الروابط المختصرة تُستعاد إن لم تكن مأخوذة."
			singular="التصنيف"
			icon={Trash2}
			backHref="/dashboard/post-categories"
			backLabel="العودة إلى التصنيفات"
			resource="post-categories"
			rootKey={queryKeys.postCategories.all}
			service={{ trash: postCategoriesService.trash, restore: postCategoriesService.restore }}
			getId={(c) => c.id}
			getCreatedAt={(c) => c.created_at}
			getLabel={(c) => categoryName(c.post_category_translations, c.translation)}
			getSubtitle={(c) => `${c.post_category_translations?.length ?? 0} ترجمة`}
		/>
	)
}
