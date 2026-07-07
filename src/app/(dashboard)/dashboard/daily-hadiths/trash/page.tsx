"use client"

import { Trash2 } from "lucide-react"
import type { AxiosResponse } from "axios"
import { dailyHadithsService } from "@/services/daily-hadiths.service"
import { queryKeys } from "@/lib/queries/keys"
import type { DailyHadith } from "@/types"
import TrashList from "@/components/trash/TrashList"

const truncate = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n)}…` : s)

export default function DailyHadithsTrashPage() {
	return (
		<TrashList<DailyHadith>
			title="سلة المهملات — الأحاديث اليومية"
			description="الأحاديث المحذوفة من التدوير. الاستعادة تُعيد الحديث إلى التدوير فوراً."
			singular="الحديث"
			icon={Trash2}
			backHref="/dashboard/daily-hadiths"
			backLabel="العودة إلى الأحاديث اليومية"
			resource="daily-hadiths"
			rootKey={queryKeys.dailyHadiths.all}
			service={{
				trash: dailyHadithsService.trash,
				// restore returns { message } on the wire; TrashList never reads
				// the body, so the cast is safe.
				restore: dailyHadithsService.restore as unknown as (
					id: string,
				) => Promise<AxiosResponse<DailyHadith>>,
			}}
			getId={(h) => h.id}
			getCreatedAt={(h) => h.created_at}
			getLabel={(h) => {
				const t = h.translation ?? h.daily_hadith_translations?.[0]
				return t?.content ? truncate(t.content) : "بدون نص"
			}}
			getSubtitle={(h) => (h.translation ?? h.daily_hadith_translations?.[0])?.source || null}
		/>
	)
}
