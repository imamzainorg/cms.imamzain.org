import type { VideoSeriesSection } from "@/types/video-series"

/** The site's four video sections, in the order the owner listed them. */
export const SECTION_OPTIONS: ReadonlyArray<{ value: VideoSeriesSection; label: string }> = [
	{ value: "programmes", label: "البرامج" },
	{ value: "commentaries", label: "الأدعية والشروح" },
	{ value: "majalis", label: "المجالس حسب المناسبة" },
	{ value: "events", label: "المؤتمرات والفعاليات" },
]

export const UNASSIGNED_LABEL = "غير مصنّف"

export function sectionLabel(section: VideoSeriesSection | null): string {
	return SECTION_OPTIONS.find((o) => o.value === section)?.label ?? UNASSIGNED_LABEL
}

/** Same pattern the API enforces (VIDEO_SLUG_PATTERN): letters, digits, `_ . ( ) -`. */
export const SLUG_PATTERN = /^[A-Za-z0-9_.()-]+$/
export const SLUG_MAX = 200
export const ORDER_MAX = 100_000
