"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Audio } from "@/types"
import { pickTranslation } from "@/lib/i18n"
import { toArabicDigits } from "@/lib/dates"
import { AudioLines, Edit2, Eye, EyeOff, Plus, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import Badge from "@/components/ui/Badge"
import EmptyState from "@/components/ui/EmptyState"
import IconButton from "@/components/ui/IconButton"
import Pagination from "@/components/ui/Pagination"
import CategoryFilterSelect from "@/components/ui/CategoryFilterSelect"
import FilterPills from "@/components/ui/FilterPills"
import PageHeader from "@/components/layout/PageHeader"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { ListSkeleton } from "@/components/ui/Skeleton"
import { useAudiosList, useDeleteAudio, useTogglePublishAudio } from "@/lib/queries/audios"
import { useSpeakersList } from "@/lib/queries/speakers"
import { useListPage } from "@/lib/use-list-page"

type StatusFilter = "all" | "published" | "draft"

/** mm:ss with Arabic-Indic digits. */
function formatDuration(secs: number | null | undefined): string {
	if (secs === null || secs === undefined || !Number.isFinite(secs)) return "—"
	const m = Math.floor(secs / 60)
	const s = Math.floor(secs % 60)
	return toArabicDigits(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`)
}

export default function AudiosPage() {
	const router = useRouter()
	const { confirm, dialog } = useConfirm()
	const { page, setPage, limit, setLimit, search, setSearch, debouncedSearch, resetPageAndSelection } =
		useListPage({ initialLimit: 20 })
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
	const [speakerFilter, setSpeakerFilter] = useState("")

	const speakersQuery = useSpeakersList({ limit: 100 })
	const speakers = speakersQuery.data?.items ?? []

	const audiosQuery = useAudiosList({
		page,
		limit,
		search: debouncedSearch || undefined,
		speaker_id: speakerFilter || undefined,
		is_published: statusFilter === "all" ? undefined : statusFilter === "published",
	})
	const audios = audiosQuery.data?.items ?? []
	const total = audiosQuery.data?.pagination.total ?? 0
	const pages = audiosQuery.data?.pagination.pages ?? 1
	const loading = audiosQuery.isLoading

	const deleteAudio = useDeleteAudio()
	const togglePublish = useTogglePublishAudio()

	const onStatusChange = (v: StatusFilter) => {
		setStatusFilter(v)
		resetPageAndSelection()
	}

	const onSpeakerChange = (id: string) => {
		setSpeakerFilter(id)
		resetPageAndSelection()
	}

	const titleOf = (a: Audio) =>
		pickTranslation(a.audio_translations, a.translation)?.title || "بدون عنوان"

	const speakerOf = (a: Audio) =>
		a.speaker
			? pickTranslation(a.speaker.speaker_translations, a.speaker.translation)?.name || null
			: null

	const handleTogglePublish = (a: Audio) => {
		togglePublish.mutate(
			{ id: a.id, is_published: !a.is_published },
			{
				onSuccess: () => toast.success(a.is_published ? "تم سحب النشر" : "تم النشر"),
				onError: (e) => toast.error(getErrorMessage(e, "تعذّر التحديث")),
			},
		)
	}

	const handleDelete = async (a: Audio) => {
		const ok = await confirm({
			title: "حذف هذا التسجيل؟",
			description: a.is_published
				? "التسجيل منشور حالياً وسيختفي من الموقع فوراً. سيُنقل إلى سلة المهملات ويمكن استعادته."
				: "سيُنقل إلى سلة المهملات. يمكنك استعادته لاحقاً.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		deleteAudio.mutate(a.id, {
			onSuccess: () => toast.success("تم الحذف"),
			onError: (e) => toast.error(getErrorMessage(e, "فشل الحذف")),
		})
	}

	const hasFilters = !!debouncedSearch || !!speakerFilter || statusFilter !== "all"

	return (
		<div className="space-y-6">
			<PageHeader
				title="الصوتيات"
				description="محاضرات وتسجيلات صوتية مع ملف PDF مرافق اختياري، منسوبة إلى محاضرين."
				icon={AudioLines}
				actions={
					<button onClick={() => router.push("/dashboard/audios/new")} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 shadow-sm transition-colors">
						<Plus className="h-4 w-4" />تسجيل جديد
					</button>
				}
			/>

			<div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
				<div className="relative flex-1 min-w-50">
					<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
					<input
						value={search} onChange={(e) => setSearch(e.target.value)}
						placeholder="ابحث في عنوان التسجيل..."
						className="w-full pr-9 pl-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
					/>
				</div>
				<CategoryFilterSelect
					categories={speakers}
					value={speakerFilter}
					onChange={onSpeakerChange}
					getName={(s) => pickTranslation(s.speaker_translations, s.translation)?.name || "بدون اسم"}
					placeholder="كل المحاضرين"
				/>
				<FilterPills<StatusFilter>
					variant="segmented"
					value={statusFilter}
					onChange={onStatusChange}
					options={[
						{ value: "all", label: "الكل" },
						{ value: "published", label: "منشور" },
						{ value: "draft", label: "مسودة" },
					]}
				/>
			</div>

			{loading ? (
				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<ListSkeleton rows={6} />
				</div>
			) : audios.length === 0 ? (
				<EmptyState
					variant="card"
					icon={AudioLines}
					title={hasFilters ? "لا توجد نتائج" : "لا توجد تسجيلات بعد"}
					description={hasFilters ? "جرّب تغيير البحث أو عوامل التصفية." : "ارفع أول تسجيل صوتي ليظهر في قسم الصوتيات على الموقع."}
					action={(
						<button onClick={() => router.push("/dashboard/audios/new")} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90">
							<Plus className="h-4 w-4" />{hasFilters ? "أضف تسجيلاً جديداً" : "أضف أول تسجيل"}
						</button>
					)}
				/>
			) : (
				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التسجيل</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المدة</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحجم</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">إجراءات</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-100">
							{audios.map((a) => {
								const speakerName = speakerOf(a)
								return (
									<tr key={a.id} className="hover:bg-gray-50">
										<td className="px-6 py-4">
											<button
												onClick={() => router.push(`/dashboard/audios/${a.id}`)}
												className="cursor-pointer flex items-center gap-3 text-right min-w-0"
											>
												<div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
													<AudioLines className="h-5 w-5 text-primary" strokeWidth={1.6} />
												</div>
												<div className="min-w-0">
													<p className="text-sm font-medium text-gray-900 truncate max-w-90 hover:text-primary transition-colors">{titleOf(a)}</p>
													{speakerName
														? <p className="text-xs text-gray-500 truncate">{speakerName}</p>
														: a.slug && <p className="text-xs text-gray-400 truncate font-mono" dir="ltr">{a.slug}</p>}
												</div>
											</button>
										</td>
										<td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{formatDuration(a.duration_seconds)}</td>
										<td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
											{a.size_mb !== null && a.size_mb !== undefined ? `${toArabicDigits(String(a.size_mb))} م.ب` : "—"}
										</td>
										<td className="px-6 py-4">
											<Badge variant={a.is_published ? "success" : "default"} dot>
												{a.is_published ? "منشور" : "مسودة"}
											</Badge>
										</td>
										<td className="px-6 py-4 text-left whitespace-nowrap">
											<div className="inline-flex items-center gap-1">
												<IconButton
													onClick={() => handleTogglePublish(a)}
													disabled={togglePublish.isPending}
													label={a.is_published ? "سحب النشر" : "نشر"}
													icon={a.is_published
														? <EyeOff className="h-4 w-4" strokeWidth={1.6} />
														: <Eye className="h-4 w-4" strokeWidth={1.6} />}
												/>
												<IconButton
													onClick={() => router.push(`/dashboard/audios/${a.id}`)}
													label="تعديل"
													icon={<Edit2 className="h-4 w-4" strokeWidth={1.6} />}
												/>
												<IconButton
													onClick={() => handleDelete(a)}
													label="حذف"
													tone="danger"
													icon={<Trash2 className="h-4 w-4" strokeWidth={1.6} />}
												/>
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
			{dialog}
		</div>
	)
}
