"use client"

import { useState } from "react"
import { Eye, EyeOff, ExternalLink, Pencil, Search, Star, Video as VideoIcon } from "lucide-react"
import { toast } from "sonner"
import type { AdminVideo, VideoKind, VideoStatus, VideoUpdateBody } from "@/types/videos"
import { getErrorMessage } from "@/lib/api"
import { formatArNumber, safeFormat, toArabicDigits } from "@/lib/dates"
import { useHasPermission } from "@/lib/permissions"
import { useUpdateVideo, useVideosList } from "@/lib/queries/videos"
import { useListPage } from "@/lib/use-list-page"
import {
	VIDEO_KIND_LABEL,
	VIDEO_STATUS_LABEL,
	VIDEO_STATUS_VARIANT,
	formatIsoDuration,
	youtubeUrl,
} from "@/lib/video-meta"
import Badge from "@/components/ui/Badge"
import EmptyState from "@/components/ui/EmptyState"
import FilterPills from "@/components/ui/FilterPills"
import IconButton from "@/components/ui/IconButton"
import Pagination from "@/components/ui/Pagination"
import PageHeader from "@/components/layout/PageHeader"
import { ListSkeleton } from "@/components/ui/Skeleton"
import VideoEditor from "@/components/videos/VideoEditor"

type StatusFilter = "all" | VideoStatus
type KindFilter = "all" | VideoKind

export default function VideosPage() {
	const canUpdate = useHasPermission("videos:update")
	const { page, setPage, limit, setLimit, search, setSearch, debouncedSearch, resetPageAndSelection } =
		useListPage({ initialLimit: 20 })
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
	const [kindFilter, setKindFilter] = useState<KindFilter>("all")
	const [editing, setEditing] = useState<AdminVideo | null>(null)

	const videosQuery = useVideosList({
		page,
		limit,
		search: debouncedSearch || undefined,
		status: statusFilter === "all" ? undefined : statusFilter,
		kind: kindFilter === "all" ? undefined : kindFilter,
	})
	const videos = videosQuery.data?.items ?? []
	const total = videosQuery.data?.pagination.total ?? 0
	const pages = videosQuery.data?.pagination.pages ?? 1
	const loading = videosQuery.isLoading

	const update = useUpdateVideo()
	const pendingId = update.isPending ? update.variables?.videoId : undefined

	const change = (v: AdminVideo, body: VideoUpdateBody, success: string) => {
		update.mutate({ videoId: v.video_id, body }, {
			onSuccess: () => toast.success(success),
			onError: (e) => toast.error(getErrorMessage(e, "تعذّر التحديث")),
		})
	}

	const onStatusFilter = (s: StatusFilter) => { setStatusFilter(s); resetPageAndSelection() }
	const onKindFilter = (k: KindFilter) => { setKindFilter(k); resetPageAndSelection() }

	const hasFilters = !!debouncedSearch || statusFilter !== "all" || kindFilter !== "all"

	return (
		<div className="space-y-6">
			<PageHeader
				title="الفيديوهات"
				description="مقاطع قناة يوتيوب المعروضة على الموقع. العنوان والوصف والصورة تأتي من يوتيوب؛ من هنا تتحكم بالنشر والتمييز والمحاضر والرابط."
				icon={VideoIcon}
			/>

			<div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
				<div className="relative flex-1 min-w-50">
					<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="ابحث في عنوان الفيديو أو وصفه..."
						className="w-full pr-9 pl-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
					/>
				</div>
				<FilterPills<KindFilter>
					variant="segmented"
					value={kindFilter}
					onChange={onKindFilter}
					options={[
						{ value: "all", label: "كل الأنواع" },
						{ value: "video", label: VIDEO_KIND_LABEL.video },
						{ value: "short", label: VIDEO_KIND_LABEL.short },
					]}
				/>
				<FilterPills<StatusFilter>
					variant="segmented"
					value={statusFilter}
					onChange={onStatusFilter}
					options={[
						{ value: "all", label: "الكل" },
						{ value: "published", label: VIDEO_STATUS_LABEL.published },
						{ value: "pending", label: VIDEO_STATUS_LABEL.pending },
						{ value: "hidden", label: VIDEO_STATUS_LABEL.hidden },
					]}
				/>
			</div>

			{loading ? (
				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<ListSkeleton rows={6} />
				</div>
			) : videosQuery.isError ? (
				<EmptyState
					variant="card"
					icon={VideoIcon}
					title="تعذّر تحميل الفيديوهات"
					description={getErrorMessage(videosQuery.error, "حدث خطأ أثناء تحميل القائمة.")}
				/>
			) : videos.length === 0 ? (
				<EmptyState
					variant="card"
					icon={VideoIcon}
					title={hasFilters ? "لا توجد نتائج" : "لا توجد فيديوهات بعد"}
					description={hasFilters ? "جرّب تغيير البحث أو عوامل التصفية." : "تظهر هنا فيديوهات القناة بعد مزامنتها من يوتيوب."}
				/>
			) : (
				<div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الفيديو</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التمييز</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">إجراءات</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-100">
							{videos.map((v) => {
								const busy = pendingId === v.video_id
								const meta = [
									v.speaker?.name,
									v.series.length ? v.series.map((s) => s.title).join("، ") : null,
									toArabicDigits(safeFormat(v.published_at, "dd/MM/yyyy", "")),
									formatIsoDuration(v.duration) !== "—" ? formatIsoDuration(v.duration) : null,
								].filter(Boolean).join(" · ")
								return (
									<tr key={v.video_id} className="hover:bg-gray-50">
										<td className="px-6 py-3">
											<div className="flex items-center gap-3 min-w-0">
												<div className="w-24 h-14 rounded-md bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
													{v.thumbnail_url
														? <img src={v.thumbnail_url} alt="" loading="lazy" className="w-full h-full object-cover" />
														: <VideoIcon className="h-5 w-5 text-gray-400" strokeWidth={1.6} />}
												</div>
												<div className="min-w-0">
													<p className="text-sm font-medium text-gray-900 truncate max-w-md" title={v.title}>{v.title}</p>
													{meta && <p className="text-xs text-gray-500 truncate max-w-md">{meta}</p>}
													<p className="text-xs text-gray-400 truncate font-mono max-w-md" dir="ltr">{v.slug}</p>
												</div>
											</div>
										</td>
										<td className="px-6 py-3 whitespace-nowrap">
											<Badge variant={v.kind === "short" ? "info" : "outline"}>{VIDEO_KIND_LABEL[v.kind]}</Badge>
										</td>
										<td className="px-6 py-3 whitespace-nowrap">
											<Badge variant={VIDEO_STATUS_VARIANT[v.status]} dot>{VIDEO_STATUS_LABEL[v.status]}</Badge>
										</td>
										<td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
											{v.is_featured
												? <span className="inline-flex items-center gap-1 text-amber-600"><Star className="h-4 w-4 fill-current" strokeWidth={1.6} />ترتيب {formatArNumber(v.featured_order)}</span>
												: "—"}
										</td>
										<td className="px-6 py-3 text-left whitespace-nowrap">
											<div className="inline-flex items-center gap-1">
												{canUpdate && v.status !== "published" && (
													<IconButton
														onClick={() => change(v, { status: "published" }, "تم النشر")}
														disabled={busy}
														label="نشر"
														icon={<Eye className="h-4 w-4" strokeWidth={1.6} />}
													/>
												)}
												{canUpdate && v.status !== "hidden" && (
													<IconButton
														onClick={() => change(v, { status: "hidden" }, "تم الإخفاء")}
														disabled={busy}
														label="إخفاء"
														icon={<EyeOff className="h-4 w-4" strokeWidth={1.6} />}
													/>
												)}
												{canUpdate && (
													<IconButton
														onClick={() => change(v, { is_featured: !v.is_featured }, v.is_featured ? "أُزيل التمييز" : "تم التمييز")}
														disabled={busy}
														label={v.is_featured ? "إزالة التمييز" : "تمييز"}
														tone={v.is_featured ? "primary" : "neutral"}
														icon={<Star className={`h-4 w-4 ${v.is_featured ? "fill-current" : ""}`} strokeWidth={1.6} />}
													/>
												)}
												{canUpdate && (
													<IconButton
														onClick={() => setEditing(v)}
														label="تعديل"
														icon={<Pencil className="h-4 w-4" strokeWidth={1.6} />}
													/>
												)}
												<a
													href={youtubeUrl(v.video_id, v.kind)}
													target="_blank"
													rel="noopener noreferrer"
													aria-label="فتح على يوتيوب"
													title="فتح على يوتيوب"
													className="cursor-pointer inline-flex items-center justify-center rounded-md p-1.5 text-[hsl(var(--foreground-muted))] hover:text-primary hover:bg-[hsl(var(--primary)/0.08)]"
												>
													<ExternalLink className="h-4 w-4" strokeWidth={1.6} />
												</a>
											</div>
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			)}

			<Pagination
				page={page}
				pages={pages}
				total={total}
				limit={limit}
				onPage={setPage}
				onLimit={setLimit}
			/>

			{editing && <VideoEditor key={editing.video_id} video={editing} onClose={() => setEditing(null)} />}
		</div>
	)
}
