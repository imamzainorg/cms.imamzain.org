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
