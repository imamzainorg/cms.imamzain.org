"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { AdminVideo, VideoStatus, VideoUpdateBody } from "@/types/videos"
import { getErrorMessage } from "@/lib/api"
import { pickTranslation } from "@/lib/i18n"
import { useSpeakersList } from "@/lib/queries/speakers"
import { useUpdateVideo } from "@/lib/queries/videos"
import {
	VIDEO_KIND_LABEL,
	VIDEO_ORDER_MAX,
	VIDEO_SLUG_MAX,
	VIDEO_SLUG_PATTERN,
	VIDEO_STATUS_LABEL,
} from "@/lib/video-meta"
import Modal from "@/components/ui/Modal"
import Select from "@/components/ui/Select"

const NO_SPEAKER = ""
const STATUSES: VideoStatus[] = ["published", "pending", "hidden"]

/**
 * Edits the only things the CMS owns about a video: status, featured flag and
 * order, speaker and slug. Title, description, thumbnail and episode order
 * come from YouTube and are deliberately not editable (owner decision).
 */
export default function VideoEditor({ video, onClose }: { video: AdminVideo; onClose: () => void }) {
	const update = useUpdateVideo()
	const speakersQuery = useSpeakersList({ limit: 100 })

	const [status, setStatus] = useState<VideoStatus>(video.status)
	const [featured, setFeatured] = useState(video.is_featured)
	const [order, setOrder] = useState(String(video.featured_order))
	const [speakerId, setSpeakerId] = useState(video.speaker_id ?? NO_SPEAKER)
	const [slug, setSlug] = useState(video.slug)

	// The API refuses a rename while the video is, and stays, published. Hiding
	// it in the same save is allowed, so the lock follows the chosen status.
	const slugLocked = video.status === "published" && status === "published"

	const speakers = (speakersQuery.data?.items ?? []).map((s) => ({
		id: s.id,
		name: pickTranslation(s.speaker_translations, s.translation)?.name || "بدون اسم",
	}))
	// Keep the current speaker selectable even if it is past the first 100 or was deleted.
	if (video.speaker_id && !speakers.some((s) => s.id === video.speaker_id)) {
		speakers.unshift({ id: video.speaker_id, name: video.speaker?.name || "محاضر غير معروف" })
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		const trimmedSlug = slug.trim()
		if (!slugLocked && trimmedSlug !== video.slug) {
			if (!trimmedSlug) { toast.error("الرابط المختصر مطلوب"); return }
			if (trimmedSlug.length > VIDEO_SLUG_MAX || !VIDEO_SLUG_PATTERN.test(trimmedSlug)) {
				toast.error("الرابط المختصر: أحرف لاتينية وأرقام و - _ . ( ) فقط")
				return
			}
		}
		const orderNum = Number(order)
		if (featured && (!Number.isInteger(orderNum) || orderNum < 0 || orderNum > VIDEO_ORDER_MAX)) {
			toast.error(`ترتيب الإبراز: عدد صحيح بين 0 و ${VIDEO_ORDER_MAX}`)
			return
		}

		// Send only what changed so an edit never clobbers a concurrent one.
		const body: VideoUpdateBody = {}
		if (status !== video.status) body.status = status
		if (featured !== video.is_featured) body.is_featured = featured
		if (featured && orderNum !== video.featured_order) body.featured_order = orderNum
		if (speakerId !== (video.speaker_id ?? NO_SPEAKER)) {
			body.speaker_id = speakerId === NO_SPEAKER ? null : speakerId
		}
		if (!slugLocked && trimmedSlug !== video.slug) body.slug = trimmedSlug

		if (Object.keys(body).length === 0) { onClose(); return }

		update.mutate({ videoId: video.video_id, body }, {
			onSuccess: () => { toast.success("تم حفظ التعديلات"); onClose() },
			onError: (err) => toast.error(getErrorMessage(err, "فشل حفظ التعديلات")),
		})
	}

	const labelCls = "block text-sm font-medium text-gray-700 mb-1"
	const fieldCls = "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"

	return (
		<Modal open onClose={onClose} title="تعديل الفيديو" size="md">
			<form onSubmit={handleSubmit}>
				<div className="p-6 space-y-4">
					<div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
						<p className="text-sm font-medium text-gray-900">{video.title}</p>
						<p className="text-xs text-gray-500 mt-0.5">
							{VIDEO_KIND_LABEL[video.kind]} — العنوان والوصف والصورة المصغّرة تأتي من يوتيوب ولا تُعدَّل هنا.
						</p>
					</div>

					<div>
						<label htmlFor="video-status" className={labelCls}>الحالة</label>
						<Select
							id="video-status"
							value={status}
							onChange={(e) => setStatus(e.target.value as VideoStatus)}
							className={`${fieldCls} cursor-pointer`}
						>
							{STATUSES.map((s) => <option key={s} value={s}>{VIDEO_STATUS_LABEL[s]}</option>)}
						</Select>
					</div>

					<div>
						<span className={labelCls}>المحاضر</span>
						<Select
							aria-label="المحاضر"
							value={speakerId}
							onChange={(e) => setSpeakerId(e.target.value)}
							className={`${fieldCls} cursor-pointer`}
						>
							<option value={NO_SPEAKER}>بدون محاضر</option>
							{speakers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
						</Select>
					</div>

					<div className="flex items-end gap-4">
						<label className="flex items-center gap-2 cursor-pointer pb-2">
							<input
								type="checkbox"
								checked={featured}
								onChange={(e) => setFeatured(e.target.checked)}
								className="h-4 w-4 text-primary rounded"
							/>
							<span className="text-sm">مميّز (يظهر في الصفحة الرئيسية)</span>
						</label>
						<div className="w-32 shrink-0 mr-auto">
							<label htmlFor="video-order" className="block text-xs font-medium text-gray-500 mb-1">ترتيب الإبراز</label>
							<input
								id="video-order"
								type="number"
								inputMode="numeric"
								min={0}
								max={VIDEO_ORDER_MAX}
								step={1}
								value={order}
								disabled={!featured}
								onChange={(e) => setOrder(e.target.value)}
								className={`${fieldCls} disabled:bg-gray-100 disabled:text-gray-400`}
							/>
						</div>
					</div>
					<p className="text-xs text-gray-500 -mt-2">الأصغر يظهر أولاً بين المميّزة. لا يظهر الفيديو على الموقع إلا إذا كان منشوراً.</p>

					<div>
						<label htmlFor="video-slug" className={labelCls}>الرابط المختصر</label>
						<input
							id="video-slug"
							dir="ltr"
							value={slug}
							disabled={slugLocked}
							maxLength={VIDEO_SLUG_MAX}
							onChange={(e) => setSlug(e.target.value)}
							className={`${fieldCls} font-mono disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed`}
						/>
						{slugLocked && (
							<p className="mt-1 text-xs text-gray-500">
								لا يمكن تغيير رابط فيديو منشور لأنه معروف للعموم. غيّر الحالة إلى «مخفي» أولاً إن لزم تغييره.
							</p>
						)}
					</div>
				</div>

				<div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-200 bg-gray-50">
					<button type="button" onClick={onClose} className="cursor-pointer px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-white">إلغاء</button>
					<button type="submit" disabled={update.isPending} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50">
						{update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}حفظ
					</button>
				</div>
			</form>
		</Modal>
	)
}
