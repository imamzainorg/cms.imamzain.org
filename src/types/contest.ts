export type ContestAttempt = {
	id: string
	full_name: string
	phone: string | null
	score: number | null
	is_submitted: boolean
	created_at: string
}
