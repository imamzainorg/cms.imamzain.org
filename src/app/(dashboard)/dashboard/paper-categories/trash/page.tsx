"use client"

import { Trash2 } from "lucide-react"
import { paperCategoriesService } from "@/services/paper-categories.service"
import { queryKeys } from "@/lib/queries/keys"
import { categoryName } from "@/lib/i18n"
import type { AcademicPaperCategory } from "@/types"
import TrashList from "@/components/trash/TrashList"

export default function PaperCategoriesTrashPage() {
	return (
		<TrashList<AcademicPaperCategory>
			title="سلة المهملات — تصنيفات الأبحاث"
			description="التصنيفات المحذوفة. الروابط المختصرة تُستعاد إن لم تكن مأخوذة."
			singular="التصنيف"
			icon={Trash2}
			backHref="/dashboard/paper-categories"
			backLabel="العودة إلى التصنيفات"
			resource="paper-categories"
			rootKey={queryKeys.paperCategories.all}
			service={{ trash: paperCategoriesService.trash, restore: paperCategoriesService.restore }}
			getId={(c) => c.id}
			getCreatedAt={(c) => c.created_at}
			getLabel={(c) => categoryName(c.academic_paper_category_translations, c.translation)}
			getSubtitle={(c) => `${c.academic_paper_category_translations?.length ?? 0} ترجمة`}
		/>
	)
}
