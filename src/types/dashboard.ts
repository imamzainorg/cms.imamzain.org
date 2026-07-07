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
	inactive_subscribers: number
	recent_subscribers: number
}

export type DashboardFormsStats = {
	contact_new: number
	contact_recent: number
	proxy_visit_pending: number
	proxy_visit_recent: number
	/** Count of submissions whose admin notification email failed (round 14.9). Non-zero = SMTP / mail-provider alert. */
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
