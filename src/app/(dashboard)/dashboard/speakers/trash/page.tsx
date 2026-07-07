"use client"

import { Trash2 } from "lucide-react"
import { speakersService } from "@/services/speakers.service"
import { queryKeys } from "@/lib/queries/keys"
import { pickTranslation } from "@/lib/i18n"
import type { Speaker } from "@/types"
import TrashList from "@/components/trash/TrashList"

export default function SpeakersTrashPage() {
	return (
		<TrashList<Speaker>
			title="سلة المهملات — المحاضرون"
			description="المحاضرون المحذوفون. الاستعادة تعيد المحاضر إلى قائمة الاختيار في نموذج التسجيل."
			singular="المحاضر"
			icon={Trash2}
			backHref="/dashboard/speakers"
			backLabel="العودة إلى المحاضرين"
			resource="speakers"
			rootKey={queryKeys.speakers.all}
			service={{ trash: speakersService.trash, restore: speakersService.restore }}
			getId={(s) => s.id}
			getCreatedAt={(s) => s.created_at}
			getLabel={(s) => pickTranslation(s.speaker_translations, s.translation)?.name || "بدون اسم"}
		/>
	)
}
