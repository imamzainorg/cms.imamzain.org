export type Subscriber = {
	id: string
	email: string
	is_active: boolean
	unsubscribed_at: string | null
	// The API returns the raw `newsletter_subscribers` row: the timestamp column
	// is `subscribed_at` (there is NO `created_at` on this table).
	subscribed_at: string
	/**
	 * When the CURRENT consent was given, re-stamped on every e-mail
	 * confirmation and on an admin resubscribe. Null = never confirmed.
	 * (Optional only because older fixtures/payloads lack it.)
	 */
	confirmed_at?: string | null
	/** When the latest confirmation e-mail went out. */
	confirmation_sent_at?: string | null
}

/**
 * Double opt-in means `is_active: false` is TWO different things:
 *  - pending      signed up, never clicked the e-mailed link
 *                 (`confirmed_at` null AND `unsubscribed_at` null)
 *  - unsubscribed was on the list and opted out / was removed by an admin
 * Show them differently: a pending row is not an unsubscribe.
 */
export type SubscriberStatus = "active" | "pending" | "unsubscribed"

export function subscriberStatus(s: Pick<Subscriber, "is_active" | "confirmed_at" | "unsubscribed_at">): SubscriberStatus {
	if (s.is_active) return "active"
	if (s.unsubscribed_at) return "unsubscribed"
	// A payload without confirmed_at cannot be told apart: treat it as unsubscribed.
	if (s.confirmed_at === null) return "pending"
	return "unsubscribed"
}
