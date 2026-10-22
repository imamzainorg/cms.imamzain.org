/**
 * One row of `GET /forms/qutuf-sajjadiya-contest/attempts` exactly as the API
 * sends it (a Prisma row). The old Swagger DTO documented different names
 * (`full_name`, `score`, `is_submitted`, `created_at`) that never existed on
 * the wire, which is why the service maps this into `ContestAttempt`.
 */
export type ContestAttemptRow = {
	id: string
	name: string | null
	phone: string | null
	email: string | null
	started_at: string | null
	/** null while the attempt is still in progress. */
	submitted_at: string | null
	ip: string | null
	user_agent: string | null
	/** The real score, whatever CONTEST_REVEAL_SCORE hides from participants. */
	final_score: number | null
}

/** The shape the contest page works with (derived from `ContestAttemptRow`). */
export type ContestAttempt = {
	id: string
	full_name: string
	phone: string | null
	email: string | null
	score: number | null
	is_submitted: boolean
	created_at: string | null
}

export function toContestAttempt(r: ContestAttemptRow): ContestAttempt {
	return {
		id: r.id,
		full_name: r.name?.trim() || "بدون اسم",
		phone: r.phone,
		email: r.email,
		score: r.final_score,
		is_submitted: r.submitted_at !== null,
		created_at: r.started_at ?? r.submitted_at,
	}
}
