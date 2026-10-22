"use client"

import { Trash2 } from "lucide-react"
import { dailyHadithsService } from "@/services/daily-hadiths.service"
import { queryKeys } from "@/lib/queries/keys"
import { formatHijriDay } from "@/lib/hijri"
import type { DailyHadith, HadithRestoreMeta } from "@/types"
import TrashList from "@/components/trash/TrashList"

const truncate = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n)}…` : s)

export default function DailyHadithsTrashPage() {
	return (
		<TrashList<DailyHadith>
			title="سلة المهملات — الأحاديث اليومية"
			description="الأحاديث المحذوفة. عند الاستعادة يعود الحديث إلى يومه الهجري، فإن كان اليوم قد أُعطي لحديث آخر في الأثناء يعود الحديث بلا يوم ويمكنك تحديد يوم جديد له."
			singular="الحديث"
			icon={Trash2}
			backHref="/dashboard/daily-hadiths"
			backLabel="العودة إلى الأحاديث اليومية"
			resource="daily-hadiths"
			rootKey={queryKeys.dailyHadiths.all}
			service={{
				trash: dailyHadithsService.trash,
				restore: dailyHadithsService.restore,
			}}
			getId={(h) => h.id}
			getCreatedAt={(h) => h.created_at}
			getLabel={(h) => {
				const t = h.translation ?? h.daily_hadith_translations?.[0]
				return t?.content ? truncate(t.content) : "بدون نص"
			}}
			getSubtitle={(h) => {
				const day = formatHijriDay(h.hijri_month, h.hijri_day)
				const source = (h.translation ?? h.daily_hadith_translations?.[0])?.source
				return [day, source].filter(Boolean).join(" — ") || null
			}}
			getRestoreNotice={(res) => {
				const meta = res.meta as HadithRestoreMeta | undefined
				if (!meta?.unscheduled) return null
				const was = formatHijriDay(meta.previous_hijri_month, meta.previous_hijri_day)
				return `تمت الاستعادة بلا يوم هجري${was ? ` — فقد أُعطي يوم ${was} لحديث آخر` : ""}. لن يظهر الحديث على الموقع حتى تحدد له يوماً.`
			}}
		/>
	)
}
