"use client"

import CategoryManager from "@/components/categories/CategoryManager"
import { paperCategoriesService } from "@/services/paper-categories.service"
import { queryKeys } from "@/lib/queries/keys"
import type { AcademicPaperCategory } from "@/types"

export default function PaperCategoriesPage() {
	return (
		<CategoryManager<AcademicPaperCategory>
			title="تصنيفات الأبحاث"
			singular="تصنيف"
			service={paperCategoriesService}
			queryKey={queryKeys.paperCategories.all}
			translationsField="academic_paper_category_translations"
			trashHref="/dashboard/paper-categories/trash"
		/>
	)
}
