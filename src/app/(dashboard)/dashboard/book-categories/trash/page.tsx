"use client"

import { Trash2 } from "lucide-react"
import { bookCategoriesService } from "@/services/book-categories.service"
import { queryKeys } from "@/lib/queries/keys"
import { categoryName } from "@/lib/i18n"
import type { BookCategory } from "@/types"
import TrashList from "@/components/trash/TrashList"

export default function BookCategoriesTrashPage() {
	return (
		<TrashList<BookCategory>
			title="سلة المهملات — تصنيفات الكتب"
			description="التصنيفات المحذوفة. الروابط المختصرة تُستعاد إن لم تكن مأخوذة."
			singular="التصنيف"
			icon={Trash2}
			backHref="/dashboard/book-categories"
			backLabel="العودة إلى التصنيفات"
			resource="book-categories"
			rootKey={queryKeys.bookCategories.all}
			service={{ trash: bookCategoriesService.trash, restore: bookCategoriesService.restore }}
			getId={(c) => c.id}
			getCreatedAt={(c) => c.created_at}
			getLabel={(c) => categoryName(c.book_category_translations, c.translation)}
			getSubtitle={(c) => `${c.book_category_translations?.length ?? 0} ترجمة`}
		/>
	)
}
