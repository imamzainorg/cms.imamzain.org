"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Lock } from "lucide-react"
import { getErrorMessage } from "@/lib/api"
import { pickTranslation } from "@/lib/i18n"
import Modal from "@/components/ui/Modal"
import Select from "@/components/ui/Select"
import { useSpeakersList } from "@/lib/queries/speakers"
import { useUpdateVideoSeries } from "@/lib/queries/video-series"
import type { UpdateVideoSeries, VideoSeries, VideoSeriesSection } from "@/types/video-series"
import { ORDER_MAX, SECTION_OPTIONS, SLUG_MAX, SLUG_PATTERN, UNASSIGNED_LABEL } from "./sections"

const NONE = ""

/**
 * Edits the CMS-owned fields of one series. Title, description, thumbnail and
 * the order and descriptions of the episodes come from YouTube and have no
 * override here (owner decisions 7, 8 and 13).
 */
export default function SeriesEditor({ series, onClose }: { series: VideoSeries; onClose: () => void }) {
	const update = useUpdateVideoSeries()
	const speakersQuery = useSpeakersList({ limit: 100 })
	const speakers = speakersQuery.data?.items ?? []

	const [section, setSection] = useState<string>(series.section ?? NONE)
	const [hidden, setHidden] = useState(series.is_hidden)
	const [order, setOrder] = useState(String(series.display_order))
	const [speakerId, setSpeakerId] = useState<string>(series.speaker_id ?? NONE)
	const [slugDraft, setSlugDraft] = useState(series.slug)

	// The slug is the public URL: the API refuses a rename while the series is
	// public before AND after the save. Hiding it in the same save is allowed.
	const slugLocked = !series.is_hidden && !hidden
	const slug = slugLocked ? series.slug : slugDraft.trim()

	// An unchanged slug is never re-validated: it was accepted when stored.
	const slugError = slug === series.slug
		? null
		: !slug
			? "الرابط المختصر مطلوب"
			: slug.length > SLUG_MAX
				? `الحد الأقصى ${SLUG_MAX} حرفاً`
				: !SLUG_PATTERN.test(slug)
					? "أحرف لاتينية وأرقام فقط، ويُسمح بـ ( ) . _ -"
					: null

	const orderNumber = Number(order)
	const orderError =
		order.trim() === "" || !Number.isInteger(orderNumber) || orderNumber < 0 || orderNumber > ORDER_MAX
			? `عدد صحيح من 0 إلى ${ORDER_MAX}`
			: null

	// Only what changed goes on the wire, so a stale form never overwrites a
	// field someone else just edited.
	const buildBody = (): UpdateVideoSeries => {
		const body: UpdateVideoSeries = {}
		if (slug !== series.slug) body.slug = slug
		if (section !== (series.section ?? NONE)) {
			body.section = section === NONE ? null : (section as VideoSeriesSection)
		}
		if (hidden !== series.is_hidden) body.is_hidden = hidden
		if (orderNumber !== series.display_order) body.display_order = orderNumber
		if (speakerId !== (series.speaker_id ?? NONE)) body.speaker_id = speakerId === NONE ? null : speakerId
		return body
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (slugError || orderError) return
		const body = buildBody()
		if (Object.keys(body).length === 0) {
			onClose()
			return
		}
		update.mutate(
			{ playlistId: series.playlist_id, body },
			{
				onSuccess: () => {
					toast.success("تم تحديث السلسلة")
					onClose()
				},
				// SLUG_LOCKED_WHILE_PUBLISHED, SLUG_ALREADY_USED, a deleted speaker: the API's message.
				onError: (err) => toast.error(getErrorMessage(err, "فشل حفظ السلسلة")),
			},
		)
	}

	const field = "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"

	return (
		<Modal open onClose={onClose} title="تعديل السلسلة" description={series.title} size="md">
			<form onSubmit={handleSubmit} noValidate>
				<div className="p-6 space-y-5">
					<p className="text-xs text-gray-500 leading-relaxed bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
						العنوان والوصف والصورة المصغّرة وترتيب الحلقات تأتي من قائمة التشغيل على يوتيوب. لتغييرها عدّل القائمة هناك وستنعكس هنا بعد المزامنة التالية.
					</p>

					<div>
						<label htmlFor="series-section" className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
						<Select
							id="series-section"
							aria-label="القسم"
							value={section}
							onChange={(e) => setSection(e.target.value)}
							className={`cursor-pointer ${field}`}
						>
							<option value={NONE}>{UNASSIGNED_LABEL}</option>
							{SECTION_OPTIONS.map((o) => (
								<option key={o.value} value={o.value}>{o.label}</option>
							))}
						</Select>
					</div>

					<div>
						<label htmlFor="series-speaker" className="block text-sm font-medium text-gray-700 mb-1">المحاضر</label>
						<Select
							id="series-speaker"
							aria-label="المحاضر"
							value={speakerId}
							onChange={(e) => setSpeakerId(e.target.value)}
							className={`cursor-pointer ${field}`}
						>
							<option value={NONE}>بدون محاضر</option>
							{/* Keep the current speaker selectable even if the list page doesn't carry it. */}
							{series.speaker_id && !speakers.some((s) => s.id === series.speaker_id) && (
								<option value={series.speaker_id}>{series.speaker?.name || "محاضر حالي"}</option>
							)}
							{speakers.map((s) => (
								<option key={s.id} value={s.id}>
									{pickTranslation(s.speaker_translations, s.translation)?.name || "بدون اسم"}
								</option>
							))}
						</Select>
					</div>

					<div>
						<label htmlFor="series-order" className="block text-sm font-medium text-gray-700 mb-1">الترتيب</label>
						<input
							id="series-order"
							type="number"
							inputMode="numeric"
							min={0}
							max={ORDER_MAX}
							value={order}
							onChange={(e) => setOrder(e.target.value)}
							dir="ltr"
							className={field}
						/>
						{orderError ? (
							<p className="mt-1 text-xs text-red-600">{orderError}</p>
						) : (
							<p className="mt-1 text-xs text-gray-500">الأصغر يظهر أولاً في صفحة الوسائط. عند التساوي تتقدّم السلسلة الأحدث نشاطاً.</p>
						)}
					</div>

					<div>
						<label className="flex items-start gap-2 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={hidden}
								onChange={(e) => setHidden(e.target.checked)}
								className="mt-0.5 h-4 w-4 text-primary rounded"
							/>
							<span className="text-sm text-gray-800">
								إخفاء السلسلة من الموقع
								<span className="block text-xs text-gray-500 mt-0.5">
									تختفي السلسلة وصفحتها من الموقع. لا يتغيّر شيء على يوتيوب.
								</span>
							</span>
						</label>
					</div>

					<div>
						<label htmlFor="series-slug" className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
							الرابط المختصر
							{slugLocked && <Lock className="h-3.5 w-3.5 text-gray-400" aria-hidden />}
						</label>
						<input
							id="series-slug"
							value={slugLocked ? series.slug : slugDraft}
							onChange={(e) => setSlugDraft(e.target.value)}
							disabled={slugLocked}
							maxLength={SLUG_MAX}
							dir="ltr"
							className={`${field} disabled:bg-gray-50 disabled:text-gray-500`}
						/>
						{slugLocked ? (
							<p className="mt-1 text-xs text-gray-500">
								الرابط مقفل لأن السلسلة منشورة وقد شاركه الناس ومحركات البحث. لتغييره فعّل «إخفاء السلسلة» أولاً واحفظ التغييرين معاً.
							</p>
						) : slugError ? (
							<p className="mt-1 text-xs text-red-600">{slugError}</p>
						) : slug !== series.slug ? (
							<p className="mt-1 text-xs text-amber-700">سيتغيّر عنوان السلسلة العام، وقد تتعطّل الروابط القديمة المنشورة.</p>
						) : null}
					</div>
				</div>

				<div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-200 bg-gray-50">
					<button type="button" onClick={onClose} className="cursor-pointer px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-white">إلغاء</button>
					<button
						type="submit"
						disabled={update.isPending || !!slugError || !!orderError}
						className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
					>
						{update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}حفظ
					</button>
				</div>
			</form>
		</Modal>
	)
}
