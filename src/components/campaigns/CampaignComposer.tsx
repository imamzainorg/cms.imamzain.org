"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { NewsletterCampaign } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { Send, Loader2, Calendar, ArrowRight, AlertCircle, Pause } from "lucide-react"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { sanitizeEditorHtml } from "@/lib/sanitize"
import RichTextEditor from "@/components/ui/RichTextEditor"
import { useSubscriberCount } from "@/lib/queries/newsletter"
import {
	useCreateCampaign,
	useUpdateCampaign,
	useSendCampaign,
	useCancelCampaign,
} from "@/lib/queries/campaigns"

type Props = { campaign?: NewsletterCampaign }

export default function CampaignComposer({ campaign }: Props) {
	const router = useRouter()
	const { confirm, dialog } = useConfirm()
	const [subject, setSubject] = useState(campaign?.subject ?? "")
	const [body, setBody] = useState(campaign?.body_html ?? "")
	const [scheduledAt, setScheduledAt] = useState(
		campaign?.scheduled_at
			? new Date(campaign.scheduled_at).toISOString().slice(0, 16)
			: "",
	)

	const activeCount = useSubscriberCount({ is_active: true })
	const recipientCount = activeCount.data ?? 0

	const createCampaign = useCreateCampaign()
	const updateCampaign = useUpdateCampaign()
	const sendCampaign = useSendCampaign()
	const cancelCampaign = useCancelCampaign()

	const isReadonly = campaign?.status === "sending" || campaign?.status === "sent"
	const saving = createCampaign.isPending || updateCampaign.isPending
	const sending = sendCampaign.isPending

	const handleSaveDraft = (close = false) => {
		if (!subject.trim()) { toast.error("الموضوع مطلوب"); return }
		if (!body.trim()) { toast.error("نص الرسالة مطلوب"); return }
		const cleaned = sanitizeEditorHtml(body)
		const payload = {
			subject: subject.trim(),
			body_html: cleaned,
			scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
		}
		const handlers = {
			onSuccess: (resp: { data: NewsletterCampaign }) => {
				toast.success(campaign ? "تم حفظ التغييرات" : "تم إنشاء الحملة")
				if (close) router.push("/dashboard/campaigns")
				else if (!campaign) router.push(`/dashboard/campaigns/${resp.data.id}`)
			},
			onError: (e: unknown) => toast.error(getErrorMessage(e, "فشل الحفظ")),
		}
		if (campaign) updateCampaign.mutate({ id: campaign.id, body: payload }, handlers)
		else createCampaign.mutate(payload, handlers)
	}

	const handleSend = async () => {
		if (!campaign) {
			toast.error("احفظ المسودة أولاً ثم اضغط إرسال")
			return
		}
		const ok = await confirm({
			title: `إرسال الحملة إلى ${recipientCount} مشترك؟`,
			description: scheduledAt
				? `الحملة مجدولة لـ ${new Date(scheduledAt).toLocaleString("ar")}. سيتم بدء الإرسال عند ذلك الموعد.`
				: "سيتم بدء الإرسال خلال دقيقة. لا يمكن التراجع بعد بدء الإرسال (لكن يمكن إلغاء البقيّة).",
			confirmText: "إرسال",
			tone: "warning",
		})
		if (!ok) return
		sendCampaign.mutate(campaign.id, {
			onSuccess: ({ data }) => {
				toast.success(`بدأ إرسال الحملة إلى ${data.recipient_count} مشترك`)
				router.push("/dashboard/campaigns")
			},
			onError: (e) => toast.error(getErrorMessage(e, "فشل بدء الإرسال")),
		})
	}

	const handleCancel = async () => {
		if (!campaign) return
		const ok = await confirm({
			title: "إلغاء الإرسال؟",
			description: "سيتوقف الإرسال للمشتركين المتبقّين فوراً.",
			confirmText: "إلغاء الإرسال",
			tone: "warning",
		})
		if (!ok) return
		cancelCampaign.mutate(campaign.id, {
			onSuccess: () => { toast.success("تم الإلغاء"); router.refresh() },
			onError: (e) => toast.error(getErrorMessage(e, "فشل الإلغاء")),
		})
	}

	return (
		<div className="space-y-6">
			<div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
				<AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
				<div className="text-sm text-blue-900 leading-relaxed">
					<p>سيتم إرسال هذه الحملة إلى <strong>{recipientCount}</strong> مشترك نشط.</p>
					<p className="mt-1 text-xs">
						يمكنك استخدام <code className="font-mono bg-blue-100 px-1 rounded">{"{{email}}"}</code> و <code className="font-mono bg-blue-100 px-1 rounded">{"{{unsubscribe_url}}"}</code> داخل نص الرسالة وسيتم استبدالها لكل مستلم. إن لم تضع رابط الإلغاء، سيُضاف تلقائياً في تذييل الرسالة.
					</p>
				</div>
			</div>

			<div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 space-y-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">الموضوع *</label>
					<input
						value={subject}
						onChange={(e) => setSubject(e.target.value)}
						readOnly={isReadonly}
						className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-lg ${isReadonly ? "bg-gray-50" : ""}`}
						placeholder="نشرة شهر مايو 2026"
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">نص الرسالة *</label>
					{isReadonly ? (
						<div className="border border-gray-200 rounded-md p-4 bg-gray-50 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: body }} />
					) : (
						<RichTextEditor value={body} onChange={setBody} placeholder="ابدأ بكتابة الرسالة..." minHeight={400} />
					)}
				</div>

				<div>
					<label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
						<Calendar className="h-3 w-3" />جدولة الإرسال (اختياري)
					</label>
					<input
						type="datetime-local"
						value={scheduledAt}
						onChange={(e) => setScheduledAt(e.target.value)}
						readOnly={isReadonly}
						className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm ${isReadonly ? "bg-gray-50" : ""}`}
					/>
					<p className="mt-1 text-[11px] text-gray-500">اتركه فارغاً للإرسال الفوري عند الضغط على &quot;إرسال&quot;.</p>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-3">
				<button
					onClick={() => router.push("/dashboard/campaigns")}
					className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
				>
					<ArrowRight className="h-4 w-4" />العودة إلى القائمة
				</button>

				<div className="flex flex-wrap gap-2">
					{campaign?.status === "sending" && (
						<button onClick={handleCancel} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm bg-amber-500 text-white rounded-md hover:bg-amber-600">
							<Pause className="h-4 w-4" />إيقاف الإرسال
						</button>
					)}
					{!isReadonly && (
						<>
							<button
								onClick={() => handleSaveDraft(false)}
								disabled={saving}
								className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
							>
								{saving && <Loader2 className="h-4 w-4 animate-spin" />}حفظ كمسودة
							</button>
							{campaign && (campaign.status === "draft" || campaign.status === "scheduled") && (
								<button
									onClick={handleSend}
									disabled={sending}
									className="cursor-pointer inline-flex items-center gap-2 px-5 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
								>
									{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
									{scheduledAt ? "جدولة الإرسال" : "إرسال الآن"}
								</button>
							)}
						</>
					)}
				</div>
			</div>
			{dialog}
		</div>
	)
}
