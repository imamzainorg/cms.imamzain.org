export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "cancelled" | "failed"

export type NewsletterCampaign = {
	id: string
	subject: string
	body_html: string
	status: CampaignStatus
	scheduled_at: string | null
	sent_at: string | null
	cancelled_at: string | null
	recipient_count: number
	delivered_count: number
	failed_count: number
	source_resource_type: string | null
	source_resource_id: string | null
	created_at: string
	updated_at: string
}

export type CreateCampaign = {
	subject: string
	body_html: string
	scheduled_at?: string
	source_resource_type?: string
	source_resource_id?: string
}

export type UpdateCampaign = Partial<CreateCampaign>
