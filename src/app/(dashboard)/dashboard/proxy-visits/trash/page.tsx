"use client"

import { Trash2 } from "lucide-react"
import { proxyVisitsService } from "@/services/proxy-visits.service"
import { queryKeys } from "@/lib/queries/keys"
import type { ProxyVisit } from "@/types"
import TrashList from "@/components/trash/TrashList"

export default function ProxyVisitsTrashPage() {
	return (
		<TrashList<ProxyVisit>
			title="سلة المهملات — طلبات الزيارة"
			description="طلبات الزيارة بالإنابة المحذوفة. يمكن استعادتها إلى القائمة."
			singular="الطلب"
			icon={Trash2}
			backHref="/dashboard/proxy-visits"
			backLabel="العودة إلى طلبات الزيارة"
			resource="proxy-visits"
			rootKey={queryKeys.proxyVisits.all}
			service={{ trash: proxyVisitsService.trash, restore: proxyVisitsService.restore }}
			getId={(v) => v.id}
			getCreatedAt={(v) => v.submitted_at ?? v.created_at}
			getLabel={(v) => v.name}
			getSubtitle={(v) => [v.phone, v.country].filter(Boolean).join(" · ") || null}
		/>
	)
}
