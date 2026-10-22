export type DashboardPostsStats = {
	total: number
	published: number
	drafts: number
	recent: number
}

export type DashboardLibraryStats = {
	books: number
	academic_papers: number
	gallery_images: number
	media_assets: number
}

export type DashboardUsersStats = {
	total: number
}

export type DashboardNewsletterStats = {
	active_subscribers: number
	/** Opted-out only: a sign-up still waiting for its confirmation click is counted in `pending_subscribers`. */
	inactive_subscribers: number
	/** Signed up but never confirmed by e-mail. Absent on older API deployments. */
	pending_subscribers?: number
	/** New CONSENTS in the window (confirmations and admin resubscribes), not raw sign-up attempts. */
	recent_subscribers: number
}

export type DashboardFormsStats = {
	contact_new: number
	contact_recent: number
	proxy_visit_pending: number
	proxy_visit_recent: number
	/**
	 * Notifications stuck RIGHT NOW (last send failed and still queued). The
	 * digest cron retries them every minute, so this returns to 0 by itself
	 * once mail flows; non-zero means e-mail delivery is currently failing.
	 */
	unsent_notifications: number
}

export type DashboardContestStats = {
	attempts_recent: number
}

export type DashboardAudiosStats = {
	total: number
	published: number
	drafts: number
}

export type DashboardStats = {
	recent_window_days: number
	posts: DashboardPostsStats
	library: DashboardLibraryStats
	users: DashboardUsersStats
	newsletter: DashboardNewsletterStats
	forms: DashboardFormsStats
	contest: DashboardContestStats
	/** Optional: absent on API deployments older than the audios module — guard at runtime. */
	audios?: DashboardAudiosStats
}
