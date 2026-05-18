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
	refresh_token: string
	user: LoginUser
}

export type RefreshResponse = {
	accessToken: string
	refresh_token: string
}

export type AdminUser = MeUser
