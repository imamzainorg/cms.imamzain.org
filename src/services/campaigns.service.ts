import { api } from "@/lib/api"
import type {
	NewsletterCampaign,
	CreateCampaign,
	UpdateCampaign,
	CampaignStatus,
	PaginatedResponse,
} from "@/types"

export const campaignsService = {
	list: (params?: { page?: number; limit?: number; status?: CampaignStatus }) =>
		api.get<PaginatedResponse<NewsletterCampaign>>("/newsletter/campaigns", { params }),

	get: (id: string) => api.get<NewsletterCampaign>(`/newsletter/campaigns/${id}`),

	create: (body: CreateCampaign) => api.post<NewsletterCampaign>("/newsletter/campaigns", body),

	update: (id: string, body: UpdateCampaign) =>
		api.patch<NewsletterCampaign>(`/newsletter/campaigns/${id}`, body),

	send: (id: string) =>
		api.post<{ id: string; recipient_count: number }>(`/newsletter/campaigns/${id}/send`),

	cancel: (id: string) =>
		api.post<NewsletterCampaign>(`/newsletter/campaigns/${id}/cancel`),

	remove: (id: string) => api.delete(`/newsletter/campaigns/${id}`),
}
