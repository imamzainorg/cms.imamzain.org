"use client"

import { Trash2 } from "lucide-react"
import { staticPagesService } from "@/services/static-pages.service"
import { queryKeys } from "@/lib/queries/keys"
import { pickTranslation } from "@/lib/i18n"
import type { StaticPage } from "@/types"
import TrashList from "@/components/trash/TrashList"

export default function StaticPagesTrashPage() {
	return (
		<TrashList<StaticPage>
			title="سلة المهملات — الصفحات الثابتة"
			description="الصفحات المحذوفة. الروابط المختصرة تُستعاد إن لم تكن مأخوذة من قبل صفحة أخرى."
			singular="الصفحة"
			icon={Trash2}
			backHref="/dashboard/static-pages"
			backLabel="العودة إلى الصفحات الثابتة"
			resource="static-pages"
			rootKey={queryKeys.staticPages.all}
			service={{ trash: staticPagesService.trash, restore: staticPagesService.restore }}
			getId={(p) => p.id}
			getCreatedAt={(p) => p.created_at}
			getLabel={(p) => p.translation?.title || pickTranslation(p.static_page_translations, p.translation)?.title || "بدون عنوان"}
			getSubtitle={(p) => {
				const slug = pickTranslation(p.static_page_translations, p.translation)?.slug
				return slug ? `/${slug}` : null
			}}
		/>
	)
}
