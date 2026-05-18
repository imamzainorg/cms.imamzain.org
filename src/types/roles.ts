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
