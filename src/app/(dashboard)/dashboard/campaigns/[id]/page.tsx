"use client"

import { use } from "react"
import { useCampaign } from "@/lib/queries/campaigns"
import CampaignComposer from "@/components/campaigns/CampaignComposer"
import { Loader2 } from "lucide-react"

export default function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const { data: campaign, isLoading } = useCampaign(id)

	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
	if (!campaign) return <p className="text-gray-500">لم يتم العثور على الحملة.</p>

	return (
		<div>
			<h1 className="text-3xl font-bold text-gray-900 mb-6">حملة بريدية</h1>
			<CampaignComposer campaign={campaign} />
		</div>
	)
}
