export type StoreTranslation = {
	lang: string
	city_name: string
}

export type StoreLocationTranslation = {
	lang: string
	name: string
	address: string
}

export type StoreLocation = {
	id: string
	phone: string | null
	gps_embed_url: string | null
	gps_link: string | null
	display_order: number
	store_location_translations: StoreLocationTranslation[]
	translation: StoreLocationTranslation | null
}

export type Store = {
	id: string
	display_order: number
	created_at: string
	updated_at: string
	store_translations: StoreTranslation[]
	store_locations: StoreLocation[]
	translation: StoreTranslation | null
}
