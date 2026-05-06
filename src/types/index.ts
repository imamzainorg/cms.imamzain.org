// --- Pagination ---

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

// --- Auth ---

export type LoginUser = {
	id: string
	username: string
	roles: string[]
	permissions: string[]
}

export type MeUser = {
	id: string
	username: string
	created_at: string
	roles: string[]
	permissions: string[]
}

export type LoginResponse = {
	accessToken: string
	user: LoginUser
}

// --- Users ---

export type UserRoleRef = {
	id: string
	name: string
}

export type UserRoleItem = {
	roles: UserRoleRef
}

export type UserSummary = {
	id: string
	username: string
	is_active: boolean
	created_at: string
	updated_at: string
	user_roles: UserRoleItem[]
}

export type UserDetail = {
	id: string
	username: string
	is_active: boolean
	created_at: string
	updated_at: string
	user_roles: UserRoleItem[]
	permissions: string[]
}

export type AdminUser = MeUser

// --- Roles & Permissions ---

export type Permission = {
	id: string
	name: string
}

export type RoleTranslationItem = {
	lang: string
	title: string
	description: string | null
}

export type Role = {
	id: string
	name: string
	role_translations: RoleTranslationItem[]
	permissions: Permission[]
}

// --- Languages ---

export type Language = {
	code: string
	name: string
	native_name: string
	is_active: boolean
	created_at: string
}

// --- Media ---

export type MediaRecord = {
	id: string
	filename: string
	url: string
	mime_type: string
	file_size: number
	alt_text: string | null
	width: number | null
	height: number | null
	created_at: string
}

// --- Gallery ---

export type GalleryImageTranslationItem = {
	lang: string
	title: string | null
	caption: string | null
	is_default: boolean
}

export type GalleryImage = {
	id: string
	image_url: string | null
	display_order: number
	created_at: string
	gallery_image_translations: GalleryImageTranslationItem[]
}

export type GalleryCategoryTranslationItem = {
	lang: string
	name: string
	is_default: boolean
}

export type GalleryCategory = {
	id: string
	created_at: string
	gallery_category_translations: GalleryCategoryTranslationItem[]
}

// --- Posts ---

export type PostTranslationItem = {
	lang: string
	title: string
	summary: string | null
	body: string
	slug: string
	is_default: boolean
}

export type PostCategoryTranslationItem = {
	lang: string
	name: string
	is_default: boolean
}

export type PostCategory = {
	id: string
	created_at: string
	post_category_translations: PostCategoryTranslationItem[]
}

export type Post = {
	id: string
	category_id: string
	cover_image_id: string | null
	is_published: boolean
	published_at: string | null
	views: number
	created_at: string
	updated_at: string
	post_translations: PostTranslationItem[]
	translation: PostTranslationItem | null
}

// --- Books ---

export type BookTranslationItem = {
	lang: string
	title: string
	author: string | null
	publisher: string | null
	description: string | null
	series: string | null
	is_default: boolean
}

export type BookCategoryTranslationItem = {
	lang: string
	name: string
	is_default: boolean
}

export type BookCategory = {
	id: string
	created_at: string
	book_category_translations: BookCategoryTranslationItem[]
}

export type Book = {
	id: string
	category_id: string
	cover_image_id: string | null
	isbn: string | null
	pages: number | null
	publish_year: string | null
	part_number: number | null
	parts: number | null
	views: number
	created_at: string
	updated_at: string
	book_translations: BookTranslationItem[]
	translation: BookTranslationItem | null
}

// --- Academic Papers ---

export type AcademicPaperTranslationItem = {
	lang: string
	title: string
	abstract: string | null
	authors: string[]
	keywords: string[]
	publication_venue: string | null
	page_count: number | null
	is_default: boolean
}

export type AcademicPaperCategoryTranslationItem = {
	lang: string
	name: string
	is_default: boolean
}

export type AcademicPaperCategory = {
	id: string
	created_at: string
	academic_paper_category_translations: AcademicPaperCategoryTranslationItem[]
}

export type AcademicPaper = {
	id: string
	category_id: string
	published_year: string | null
	pdf_url: string | null
	created_at: string
	updated_at: string
	academic_paper_translations: AcademicPaperTranslationItem[]
	translation: AcademicPaperTranslationItem | null
}

// --- Forms: Contact ---

export type Contact = {
	id: string
	name: string
	email: string
	message: string
	status: "NEW" | "RESPONDED" | "SPAM"
	created_at: string
}

// --- Forms: Proxy Visit ---

export type ProxyVisit = {
	id: string
	name: string
	phone: string | null
	country: string | null
	status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED"
	created_at: string
}

// --- Newsletter ---

export type Subscriber = {
	id: string
	email: string
	is_active: boolean
	unsubscribed_at: string | null
	created_at: string
}

// --- Audit Logs ---

export type AuditLog = {
	id: string
	user_id: string | null
	action: string
	resource_type: string
	resource_id: string | null
	ip_address: string | null
	user_agent: string | null
	changes: Record<string, unknown> | null
	created_at: string
	users?: { id: string; username: string }
}

// --- Contest ---

export type ContestAttempt = {
	id: string
	full_name: string
	phone: string | null
	score: number | null
	is_submitted: boolean
	created_at: string
}
