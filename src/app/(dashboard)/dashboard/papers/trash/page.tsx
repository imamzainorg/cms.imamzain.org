"use client"

import { Trash2 } from "lucide-react"
import { papersService } from "@/services/papers.service"
import { queryKeys } from "@/lib/queries/keys"
import { pickTranslation } from "@/lib/i18n"
import type { AcademicPaper } from "@/types"
import TrashList from "@/components/trash/TrashList"

export default function PapersTrashPage() {
	return (
		<TrashList<AcademicPaper>
			title="سلة المهملات — الأبحاث"
			description="الأبحاث المحذوفة. يمكن استعادتها مع كل الترجمات."
			singular="البحث"
			icon={Trash2}
			backHref="/dashboard/papers"
			backLabel="العودة إلى الأبحاث"
			resource="papers"
			rootKey={queryKeys.papers.all}
			service={{ trash: papersService.trash, restore: papersService.restore }}
			getId={(p) => p.id}
			getCreatedAt={(p) => p.created_at}
			getLabel={(p) => pickTranslation(p.academic_paper_translations, p.translation)?.title || "بدون عنوان"}
			getSubtitle={(p) => {
				const authors = pickTranslation(p.academic_paper_translations, p.translation)?.authors ?? []
				return authors.length ? authors.join("، ") : null
			}}
		/>
	)
}
