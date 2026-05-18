export type PaginationMeta = {
	page: number
	limit: number
	total: number
	pages: number
}

export type PaginatedResponse<T> = {
	items: T[]
	pagination: PaginationMeta
}
