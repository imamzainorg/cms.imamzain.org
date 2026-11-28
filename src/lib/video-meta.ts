import { toArabicDigits } from "@/lib/dates"
import type { VideoKind, VideoStatus } from "@/types/videos"

export const VIDEO_STATUS_LABEL: Record<VideoStatus, string> = {
	published: "منشور",
	pending: "بانتظار المراجعة",
	hidden: "مخفي",
}

export const VIDEO_STATUS_VARIANT: Record<VideoStatus, "success" | "warning" | "default"> = {
	published: "success",
	pending: "warning",
	hidden: "default",
}

export const VIDEO_KIND_LABEL: Record<VideoKind, string> = {
	video: "فيديو",
	short: "مقطع قصير",
}

/** The API's slug rule for videos (YouTube ids carry capitals, `_`, and a few live URLs have `(`, `)`, `.`). */
export const VIDEO_SLUG_PATTERN = /^[A-Za-z0-9_.()-]+$/
export const VIDEO_SLUG_MAX = 200
export const VIDEO_ORDER_MAX = 100_000

export function youtubeUrl(videoId: string, kind: VideoKind): string {
	const id = encodeURIComponent(videoId)
	return kind === "short"
		? `https://www.youtube.com/shorts/${id}`
		: `https://www.youtube.com/watch?v=${id}`
}

/** `PT1H2M3S` -> `1:02:03`, `PT45S` -> `0:45`, with Arabic-Indic digits. "—" when absent or unparsable. */
export function formatIsoDuration(iso: string | null | undefined): string {
	if (!iso) return "—"
	const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso)
	if (!m) return "—"
	const [d, h, min, s] = [m[1], m[2], m[3], m[4]].map((n) => Number(n ?? 0))
	const hours = d * 24 + h
	const pad = (n: number) => String(n).padStart(2, "0")
	const text = hours > 0 ? `${hours}:${pad(min)}:${pad(s)}` : `${min}:${pad(s)}`
	return toArabicDigits(text)
}
