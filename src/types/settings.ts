export type SettingType = "string" | "number" | "boolean" | "json"

export type Setting = {
	key: string
	/** Server returns the decoded value (string | number | boolean | object), wire format is always stringified */
	value: string | number | boolean | Record<string, unknown> | unknown[] | null
	type: SettingType
	description?: string
	is_public: boolean
	updated_at: string
	updated_by?: string | null
}

export type UpsertSetting = {
	value: string
	type?: SettingType
	description?: string
	is_public?: boolean
}
