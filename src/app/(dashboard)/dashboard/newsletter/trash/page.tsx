"use client"

import { Trash2 } from "lucide-react"
import { newsletterService } from "@/services/newsletter.service"
import { queryKeys } from "@/lib/queries/keys"
import type { Subscriber } from "@/types"
import TrashList from "@/components/trash/TrashList"

export default function NewsletterTrashPage() {
	return (
		<TrashList<Subscriber>
			title="سلة المهملات — مشتركو النشرة"
			description="المشتركون المحذوفون. الاستعادة تُعيد المشترك وتفعّله من جديد."
			singular="المشترك"
			icon={Trash2}
			backHref="/dashboard/newsletter"
			backLabel="العودة إلى النشرة البريدية"
			resource="newsletter-subscribers"
			rootKey={queryKeys.newsletter.all}
			service={{ trash: newsletterService.trash, restore: newsletterService.restore }}
			getId={(s) => s.id}
			getCreatedAt={(s) => s.subscribed_at}
			getLabel={(s) => s.email}
		/>
	)
}
