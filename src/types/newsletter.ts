export type Subscriber = {
	id: string
	email: string
	is_active: boolean
	unsubscribed_at: string | null
	// The API returns the raw `newsletter_subscribers` row: the timestamp column
	// is `subscribed_at` (there is NO `created_at` on this table).
	subscribed_at: string
}
