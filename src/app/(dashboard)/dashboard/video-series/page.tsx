"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Eye, EyeOff, ListVideo, Pencil, Search } from "lucide-react"
import { getErrorMessage } from "@/lib/api"
import { formatArNumber } from "@/lib/dates"
import { useHasPermission } from "@/lib/permissions"
import PageHeader from "@/components/layout/PageHeader"
import Badge from "@/components/ui/Badge"
import EmptyState from "@/components/ui/EmptyState"
import FilterPills from "@/components/ui/FilterPills"
import { ListSkeleton } from "@/components/ui/Skeleton"
import AutoPublishCard from "@/components/video-series/AutoPublishCard"
import SeriesEditor from "@/components/video-series/SeriesEditor"
import { SECTION_OPTIONS, UNASSIGNED_LABEL, sectionLabel } from "@/components/video-series/sections"
import { useUpdateVideoSeries, useVideoSeriesList } from "@/lib/queries/video-series"
import type { VideoSeries } from "@/types/video-series"

type Filter = "all" | "programmes" | "commentaries" | "majalis" | "events" | "none" | "hidden"

const FILTERS: ReadonlyArray<{ value: Filter; label: string }> = [
	{ value: "all", label: "الكل" },
	...SECTION_OPTIONS,
	{ value: "none", label: UNASSIGNED_LABEL },
	{ value: "hidden", label: "المخفية" },
]

function matches(s: VideoSeries, filter: Filter): boolean {
	if (filter === "all") return true
	if (filter === "hidden") return s.is_hidden
	if (filter === "none") return s.section === null
	return s.section === filter
}

export default function VideoSeriesPage() {
	const seriesQuery = useVideoSeriesList()
	const toggleHidden = useUpdateVideoSeries()
	const canUpdate = useHasPermission("videos:update")

	const [filter, setFilter] = useState<Filter>("all")
	const [search, setSearch] = useState("")
	const [editing, setEditing] = useState<VideoSeries | null>(null)

	const all = useMemo(() => seriesQuery.data ?? [], [seriesQuery.data])
	const shown = useMemo(() => {
		const q = search.trim().toLowerCase()
		return all.filter(
			(s) => matches(s, filter) && (!q || s.title.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q)),
		)
	}, [all, filter, search])

	const handleToggleHidden = (s: VideoSeries) => {
		toggleHidden.mutate(
			{ playlistId: s.playlist_id, body: { is_hidden: !s.is_hidden } },
			{
				onSuccess: () => toast.success(s.is_hidden ? "أُظهرت السلسلة على الموقع" : "أُخفيت السلسلة عن الموقع"),
				onError: (e) => toast.error(getErrorMessage(e, "فشل تحديث السلسلة")),
			},
		)
	}

	const hasFilters = filter !== "all" || !!search.trim()

	return (
		<div className="space-y-6">
			<PageHeader
				title="سلاسل الفيديو"
				description="كل قائمة تشغيل على يوتيوب سلسلة على الموقع. هنا تحدّد قسمها وترتيبها ومحاضرها، أو تخفيها."
				icon={ListVideo}
			/>

			<AutoPublishCard />

			<div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
				<div className="relative flex-1 min-w-56 max-w-md">
					<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="ابحث في عنوان السلسلة أو رابطها..."
						aria-label="بحث في السلاسل"
						className="w-full pr-9 pl-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
					/>
				</div>
				<FilterPills value={filter} options={FILTERS} onChange={setFilter} variant="segmented" className="flex-wrap" />
			</div>

			{seriesQuery.isLoading ? (
				<ListSkeleton rows={6} />
			) : seriesQuery.isError ? (
				<EmptyState
					variant="card"
					icon={ListVideo}
					title="تعذّر تحميل السلاسل"
					description={getErrorMessage(seriesQuery.error, "حدث خطأ غير متوقع.")}
					action={
						<button onClick={() => seriesQuery.refetch()} className="cursor-pointer px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90">
							إعادة المحاولة
						</button>
					}
				/>
			) : shown.length === 0 ? (
				<EmptyState
					variant="card"
					icon={ListVideo}
					title={hasFilters ? "لا توجد نتائج" : "لا توجد سلاسل بعد"}
					description={
						hasFilters
							? "جرّب تغيير القسم أو كلمة البحث."
							: "تظهر هنا قوائم التشغيل بعد أن تجلبها المزامنة من يوتيوب."
					}
				/>
			) : (
				<ul className="space-y-3">
					{shown.map((s) => (
						<li
							key={s.playlist_id}
							className={`bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 transition-colors ${s.is_hidden ? "opacity-75" : ""}`}
						>
							{s.thumbnail_url ? (
								<img src={s.thumbnail_url} alt="" loading="lazy" className="w-28 aspect-video object-cover rounded-md bg-gray-100 shrink-0" />
							) : (
								<div className="w-28 aspect-video rounded-md bg-gray-100 shrink-0" aria-hidden />
							)}

							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-center gap-2">
									<h3 className="text-sm font-semibold text-gray-900 truncate">{s.title}</h3>
									{s.is_hidden && <Badge variant="default" size="sm">مخفية</Badge>}
									{s.section === null && <Badge variant="warning" size="sm">{UNASSIGNED_LABEL}</Badge>}
								</div>
								<p className="mt-1 text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5">
									{s.section !== null && <span>{sectionLabel(s.section)}</span>}
									<span>{formatArNumber(s.video_count)} مقطعاً</span>
									{s.speaker && <span>{s.speaker.name || "محاضر بلا اسم"}</span>}
									<span>الترتيب {formatArNumber(s.display_order)}</span>
								</p>
								<p className="mt-0.5 text-[11px] text-gray-400 truncate" dir="ltr">/{s.slug}</p>
							</div>

							{canUpdate && (
								<div className="flex gap-1 shrink-0">
									<button
										onClick={() => handleToggleHidden(s)}
										disabled={toggleHidden.isPending}
										title={s.is_hidden ? "إظهار على الموقع" : "إخفاء عن الموقع"}
										aria-label={s.is_hidden ? `إظهار ${s.title}` : `إخفاء ${s.title}`}
										className="cursor-pointer p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded disabled:opacity-50"
									>
										{s.is_hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
									</button>
									<button
										onClick={() => setEditing(s)}
										title="تعديل"
										aria-label={`تعديل ${s.title}`}
										className="cursor-pointer p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded"
									>
										<Pencil className="h-4 w-4" />
									</button>
								</div>
							)}
						</li>
					))}
				</ul>
			)}

			{editing && <SeriesEditor key={editing.playlist_id} series={editing} onClose={() => setEditing(null)} />}
		</div>
	)
}
