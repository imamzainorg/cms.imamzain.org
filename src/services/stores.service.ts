import { api } from "@/lib/api"
import type { PaginatedResponse, Store } from "@/types"

type StoreTranslationBody = { lang: string; city_name: string }

type LocationTranslationBody = { lang: string; name: string; address: string }

type LocationBody = {
	// null clears the stored value (PATCH: undefined = leave unchanged)
	phone?: string | null
	gps_embed_url?: string | null
	gps_link?: string | null
	display_order?: number
	translations: LocationTranslationBody[]
}

export const storesService = {
	list: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<Store>>("/stores", { params }),

	get: (id: string) => api.get<Store>(`/stores/${id}`),

	create: (body: {
		translations: StoreTranslationBody[]
		display_order?: number
		locations?: LocationBody[]
	}) => api.post<Store>("/stores", body),

	// PATCH covers scalars + city-name translation upserts only —
	// sale-points are managed through the nested /locations routes.
	update: (id: string, body: Partial<{
		translations: StoreTranslationBody[]
		display_order: number
	}>) => api.patch<Store>(`/stores/${id}`, body),

	remove: (id: string) => api.delete(`/stores/${id}`),

	trash: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<Store>>("/stores/trash", { params }),

	restore: (id: string) => api.post<Store>(`/stores/${id}/restore`),

	// ── Nested sale-points — every call returns the FULL updated store ──

	addLocation: (storeId: string, body: LocationBody) =>
		api.post<Store>(`/stores/${storeId}/locations`, body),

	updateLocation: (storeId: string, locationId: string, body: Partial<LocationBody>) =>
		api.patch<Store>(`/stores/${storeId}/locations/${locationId}`, body),

	removeLocation: (storeId: string, locationId: string) =>
		api.delete<Store>(`/stores/${storeId}/locations/${locationId}`),
}
