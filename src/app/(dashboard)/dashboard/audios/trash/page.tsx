"use client"

import { Trash2 } from "lucide-react"
import { audiosService } from "@/services/audios.service"
import { queryKeys } from "@/lib/queries/keys"
import { pickTranslation } from "@/lib/i18n"
import type { Audio } from "@/types"
import TrashList from "@/components/trash/TrashList"

export default function AudiosTrashPage() {
	return (
		<TrashList<Audio>
			title="سلة المهملات — الصوتيات"
			description="التسجيلات المحذوفة. يُستعاد الرابط المختصر إن لم يكن مأخوذاً من قبل تسجيل آخر."
			singular="التسجيل"
			icon={Trash2}
			backHref="/dashboard/audios"
			backLabel="العودة إلى الصوتيات"
			resource="audios"
			rootKey={queryKeys.audios.all}
			service={{ trash: audiosService.trash, restore: audiosService.restore }}
			getId={(a) => a.id}
			getCreatedAt={(a) => a.created_at}
			getLabel={(a) => pickTranslation(a.audio_translations, a.translation)?.title || "بدون عنوان"}
			getSubtitle={(a) =>
				(a.speaker
					? pickTranslation(a.speaker.speaker_translations, a.speaker.translation)?.name
					: null) || a.slug}
		/>
	)
}
