// --- Pagination ---

export type PaginatedResponse<T> = {
	data: T[]
	total: number
	page: number
	limit: number
}

// --- Auth ---

export type AdminUser = {
	id: string
	username: string
	is_active: boolean
	created_at: string
	updated_at: string
	roles: Role[]
}

export type LoginResponse = {
	access_token: string
	user: AdminUser
}

// --- Roles & Permissions ---

export type Permission = {
	id: string
	name: string
	translations: { lang: string; title: string; description: string | null }[]
}

export type Role = {
	id: string
	name: string
	translations: { lang: string; title: string; description: string | null }[]
	permissions: Permission[]
}

// --- Languages ---

export type Language = {
	code: string
	name: string
	is_active: boolean
	is_rtl: boolean
}

// --- Media ---

export type MediaRecord = {
	id: string
	key: string
	url: string
	filename: string
	alt_text: string | null
	mime_type: string
	file_size: number
	width: number | null
	height: number | null
	created_at: string
}

// --- Gallery ---

export type GalleryTranslation = {
	lang: string
	title: string | null
	caption: string | null
	is_default: boolean
}

export type GalleryImage = {
	media_id: string
	category_id: string | null
	tags: string[]
	location: string | null
	translations: GalleryTranslation[]
	media: MediaRecord
	category?: { id: string; translations: { lang: string; title: string }[] }
}

export type GalleryCategory = {
	id: string
	translations: { lang: string; title: string; slug: string; description: string | null }[]
}

// --- Posts ---

export type PostTranslation = {
	lang: string
	title: string
	summary: string | null
	body: string
	slug: string
	is_default: boolean
}

export type PostCategory = {
	id: string
	translations: { lang: string; title: string; slug: string; description: string | null }[]
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
	translations: PostTranslation[]
	category?: PostCategory
	cover_image?: MediaRecord
	attachments?: MediaRecord[]
}

// --- Books ---

export type BookTranslation = {
	lang: string
	title: string
	author: string | null
	publisher: string | null
	description: string | null
	series: string | null
	is_default: boolean
}

export type BookCategory = {
	id: string
	translations: { lang: string; title: string; slug: string; description: string | null }[]
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
	translations: BookTranslation[]
	category?: BookCategory
	cover_image?: MediaRecord
}

// --- Academic Papers ---

export type AcademicPaperTranslation = {
	lang: string
	title: string
	abstract: string | null
	authors: string[]
	keywords: string[]
	publication_venue: string | null
	page_count: number | null
	is_default: boolean
}

export type AcademicPaperCategory = {
	id: string
	translations: { lang: string; title: string; slug: string; description: string | null }[]
}

export type AcademicPaper = {
	id: string
	category_id: string
	published_year: string | null
	pdf_url: string | null
	created_at: string
	updated_at: string
	translations: AcademicPaperTranslation[]
	category?: AcademicPaperCategory
}

// --- Forms: Contact ---

export type Contact = {
	id: string
	name: string
	email: string
	country: string | null
	message: string
	status: "NEW" | "RESPONDED" | "SPAM"
	submitted_at: string
	responded_at: string | null
	responded_by: string | null
	notes: string | null
}

// --- Forms: Proxy Visit ---

export type ProxyVisit = {
	id: string
	name: string
	email: string
	phone: string | null
	country: string | null
	status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED"
	submitted_at: string
	processed_at: string | null
	processed_by: string | null
	notes: string | null
}

// --- Newsletter ---

export type Subscriber = {
	id: string
	email: string
	is_active: boolean
	subscribed_at: string
	unsubscribed_at: string | null
}

// --- Audit Logs ---

export type AuditLog = {
	id: string
	user_id: string | null
	action: string
	resource_type: string
	resource_id: string | null
	metadata: Record<string, unknown> | null
	created_at: string
	user?: { id: string; username: string }
}

// --- Contest ---

export type ContestAttempt = {
	id: string
	participant_name: string
	participant_email: string
	participant_phone: string | null
	score: number | null
	total_questions: number
	submitted: boolean
	started_at: string
	submitted_at: string | null
}