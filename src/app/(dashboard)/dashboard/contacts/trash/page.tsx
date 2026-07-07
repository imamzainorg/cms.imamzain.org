"use client"

import { Trash2 } from "lucide-react"
import { contactsService } from "@/services/contacts.service"
import { queryKeys } from "@/lib/queries/keys"
import type { Contact } from "@/types"
import TrashList from "@/components/trash/TrashList"

export default function ContactsTrashPage() {
	return (
		<TrashList<Contact>
			title="سلة المهملات — رسائل التواصل"
			description="الرسائل المحذوفة. يمكن استعادتها إلى صندوق الوارد."
			singular="الرسالة"
			icon={Trash2}
			backHref="/dashboard/contacts"
			backLabel="العودة إلى رسائل التواصل"
			resource="contacts"
			rootKey={queryKeys.contacts.all}
			service={{ trash: contactsService.trash, restore: contactsService.restore }}
			getId={(c) => c.id}
			getCreatedAt={(c) => c.submitted_at ?? c.created_at}
			getLabel={(c) => c.name || c.email}
			getSubtitle={(c) => c.subject || c.email}
		/>
	)
}
