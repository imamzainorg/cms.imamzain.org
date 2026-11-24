"use client"

import { toast } from "sonner"
import { Loader2, Rocket } from "lucide-react"
import { getErrorMessage } from "@/lib/api"
import { useHasPermission } from "@/lib/permissions"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { Skeleton } from "@/components/ui/Skeleton"
import { useUpdateVideoSettings, useVideoSettings } from "@/lib/queries/video-series"

/**
 * The one CMS switch that decides what happens to a NEW YouTube upload:
 * on, it goes live by itself; off, it waits as "pending" until an editor
 * publishes it. It never touches videos that already exist.
 */
export default function AutoPublishCard() {
	const settings = useVideoSettings()
	const update = useUpdateVideoSettings()
	const canUpdate = useHasPermission("videos:update")
	const { confirm, dialog } = useConfirm()

	const on = settings.data?.auto_publish ?? false

	const set = async (next: boolean) => {
		if (next) {
			const ok = await confirm({
				title: "تفعيل النشر التلقائي؟",
				description: "ستظهر كل مقاطع يوتيوب الجديدة على الموقع فور مزامنتها، دون مراجعة من أحد. المقاطع الموجودة الآن لا تتغيّر.",
				confirmText: "تفعيل",
				tone: "warning",
			})
			if (!ok) return
		}
		update.mutate(next, {
			onSuccess: () => toast.success(next ? "فُعِّل النشر التلقائي" : "أُوقف النشر التلقائي"),
			onError: (e) => toast.error(getErrorMessage(e, "فشل حفظ الإعداد")),
		})
	}

	return (
		<section
			aria-labelledby="auto-publish-title"
			className="bg-white rounded-xl border border-[hsl(var(--border))] shadow-soft px-6 py-5"
		>
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-start gap-3 min-w-0">
					<div className="shrink-0 w-10 h-10 rounded-md bg-[hsl(var(--primary)/0.08)] ring-1 ring-[hsl(var(--primary)/0.15)] flex items-center justify-center">
						<Rocket className="h-5 w-5 text-primary" strokeWidth={1.6} />
					</div>
					<div className="min-w-0">
						<h2 id="auto-publish-title" className="text-base font-bold text-foreground">
							النشر التلقائي للمقاطع الجديدة
						</h2>
						{settings.isLoading ? (
							<Skeleton className="h-4 w-72 mt-2" />
						) : settings.isError ? (
							<p className="mt-1 text-sm text-red-600">
								{getErrorMessage(settings.error, "تعذّر تحميل الإعداد")}
							</p>
						) : (
							<div className="mt-1 text-sm text-[hsl(var(--foreground-muted))] leading-relaxed space-y-1">
								<p>
									<strong className={on ? "text-emerald-700" : "text-amber-700"}>
										{on ? "مفعَّل:" : "موقوف:"}
									</strong>{" "}
									{on
										? "كل مقطع جديد يُرفع على يوتيوب يظهر على الموقع تلقائياً."
										: "المقاطع الجديدة تنتظر كـ«بانتظار المراجعة» ولا تظهر على الموقع حتى ينشرها محرّر."}
								</p>
								<p className="text-xs">
									في الحالتين يستطيع المحرّر إخفاء أي مقطع أو نشر مقطع منتظر. الإعداد لا يغيّر المقاطع الموجودة، ولا يشمل البثوث المباشرة فهي لا تُعرض على الموقع.
								</p>
							</div>
						)}
					</div>
				</div>

				{!settings.isLoading && !settings.isError && (
					<div className="shrink-0 flex items-center gap-2">
						{update.isPending && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
						<button
							type="button"
							role="switch"
							aria-checked={on}
							aria-label="النشر التلقائي للمقاطع الجديدة"
							disabled={!canUpdate || update.isPending}
							title={canUpdate ? undefined : "ليست لديك صلاحية تعديل هذا الإعداد"}
							onClick={() => set(!on)}
							className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed ${on ? "bg-primary" : "bg-gray-300"}`}
						>
							<span
								className={`inline-block h-5 w-5 mx-0.5 rounded-full bg-white shadow transition-transform ${on ? "-translate-x-5" : "translate-x-0"}`}
							/>
						</button>
					</div>
				)}
			</div>
			{dialog}
		</section>
	)
}
