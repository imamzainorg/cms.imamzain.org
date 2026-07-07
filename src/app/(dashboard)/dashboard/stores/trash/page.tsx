"use client"

import { Trash2 } from "lucide-react"
import { storesService } from "@/services/stores.service"
import { queryKeys } from "@/lib/queries/keys"
import { pickTranslation } from "@/lib/i18n"
import { formatArNumber } from "@/lib/dates"
import type { Store } from "@/types"
import TrashList from "@/components/trash/TrashList"

export default function StoresTrashPage() {
	return (
		<TrashList<Store>
			title="سلة المهملات — منافذ البيع"
			description="المدن المحذوفة مع نقاط بيعها. الاستعادة تعيدها إلى الموقع العام مباشرة."
			singular="المدينة"
			icon={Trash2}
			backHref="/dashboard/stores"
			backLabel="العودة إلى منافذ البيع"
			resource="stores"
			rootKey={queryKeys.stores.all}
			service={{ trash: storesService.trash, restore: storesService.restore }}
			getId={(s) => s.id}
			getCreatedAt={(s) => s.created_at}
			getLabel={(s) => pickTranslation(s.store_translations, s.translation)?.city_name || "بدون اسم"}
			getSubtitle={(s) => `${formatArNumber(s.store_locations.length)} نقطة بيع`}
		/>
	)
}
