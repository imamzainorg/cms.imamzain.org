"use client"

import { Trash2 } from "lucide-react"
import { usersService } from "@/services/users.service"
import { queryKeys } from "@/lib/queries/keys"
import type { UserSummary } from "@/types"
import TrashList from "@/components/trash/TrashList"

export default function UsersTrashPage() {
	return (
		<TrashList<UserSummary>
			title="سلة المهملات — المستخدمون"
			description="الحسابات المحذوفة. تفشل الاستعادة إن كان اسم المستخدم الأصلي قد أُخذ من قبل حساب آخر — عدّل أحدهما أولاً."
			singular="المستخدم"
			icon={Trash2}
			backHref="/dashboard/users"
			backLabel="العودة إلى المستخدمين"
			resource="users"
			rootKey={queryKeys.users.all}
			service={{ trash: usersService.trash, restore: usersService.restore }}
			getId={(u) => u.id}
			getCreatedAt={(u) => u.created_at}
			getLabel={(u) => u.username}
			getSubtitle={(u) => (u.user_roles ?? []).map((r) => r.roles.name).join("، ") || null}
		/>
	)
}
