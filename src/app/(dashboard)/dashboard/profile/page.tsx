"use client"

import { useState, useMemo } from "react"
import { useMutation } from "@tanstack/react-query"
import { useAuthStore } from "@/store/auth"
import { authService } from "@/services/auth.service"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { Loader2, Lock, Shield, Calendar, KeyRound, Check } from "lucide-react"
import { format } from "date-fns"

// Localized labels for permission resource and verb segments.
// Permissions in the API are slug-shaped like "posts:create" or "newsletter:read".
const RESOURCE_LABELS: Record<string, string> = {
	posts: "المقالات",
	"post-categories": "تصنيفات المقالات",
	books: "الكتب",
	"book-categories": "تصنيفات الكتب",
	papers: "الأبحاث",
	"academic-papers": "الأبحاث",
	"academic-paper-categories": "تصنيفات الأبحاث",
	"paper-categories": "تصنيفات الأبحاث",
	gallery: "المعرض",
	"gallery-categories": "تصنيفات المعرض",
	media: "الوسائط",
	users: "المستخدمون",
	roles: "الأدوار",
	languages: "اللغات",
	newsletter: "النشرة البريدية",
	contacts: "الرسائل",
	forms: "النماذج",
	contest: "المسابقات",
	"audit-logs": "سجلات التدقيق",
	auth: "المصادقة",
}

const VERB_LABELS: Record<string, string> = {
	create: "إنشاء",
	read: "قراءة",
	update: "تعديل",
	delete: "حذف",
	publish: "نشر",
	manage: "إدارة كاملة",
	list: "عرض القائمة",
	view: "مشاهدة",
	upload: "رفع",
	download: "تنزيل",
	export: "تصدير",
}

function localizePermission(p: string): { resourceLabel: string; verbLabel: string } {
	const [res, verb = "—"] = p.split(":")
	return {
		resourceLabel: RESOURCE_LABELS[res] || res,
		verbLabel: VERB_LABELS[verb] || verb,
	}
}

export default function ProfilePage() {
	const { user } = useAuthStore()
	const [pw, setPw] = useState({ current: "", next: "", confirm: "" })
	const changePassword = useMutation({
		mutationFn: ({ current, next }: { current: string; next: string }) =>
			authService.changePassword(current, next),
	})
	const saving = changePassword.isPending

	const grouped = useMemo(() => {
		if (!user?.permissions) return [] as Array<{ resource: string; resourceLabel: string; verbs: { name: string; label: string }[] }>
		const map: Record<string, { resourceLabel: string; verbs: { name: string; label: string }[] }> = {}
		for (const p of user.permissions) {
			const { resourceLabel, verbLabel } = localizePermission(p)
			const [res] = p.split(":")
			if (!map[res]) map[res] = { resourceLabel, verbs: [] }
			map[res].verbs.push({ name: p, label: verbLabel })
		}
		return Object.entries(map)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([resource, v]) => ({ resource, ...v }))
	}, [user?.permissions])

	const handleChangePassword = (e: React.FormEvent) => {
		e.preventDefault()
		if (pw.next !== pw.confirm) { toast.error("كلمتا المرور غير متطابقتين"); return }
		if (pw.next.length < 6) { toast.error("كلمة المرور يجب ألا تقل عن ٦ أحرف"); return }
		changePassword.mutate(
			{ current: pw.current, next: pw.next },
			{
				onSuccess: () => {
					toast.success("تم تغيير كلمة المرور")
					setPw({ current: "", next: "", confirm: "" })
				},
				onError: (e) => toast.error(getErrorMessage(e, "فشل تغيير كلمة المرور")),
			},
		)
	}

	if (!user) return null

	return (
		<div className="max-w-5xl">
			<h1 className="text-3xl font-bold text-gray-900 mb-6">حسابي</h1>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-1 space-y-4">
					<div className="bg-white rounded-xl border border-gray-200 p-6">
						<div className="flex flex-col items-center text-center">
							<div className="w-20 h-20 rounded-full bg-linear-to-br from-primary to-primary/70 text-white flex items-center justify-center text-3xl font-bold shadow-md mb-3">
								{user.username[0]?.toUpperCase()}
							</div>
							<h2 className="text-lg font-semibold text-gray-900">{user.username}</h2>
							<p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
								<Calendar className="h-3 w-3" />
								انضمّ {user.created_at ? format(new Date(user.created_at), "dd/MM/yyyy") : "—"}
							</p>
						</div>
						<div className="border-t border-gray-100 mt-5 pt-4 space-y-3">
							<div>
								<p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
									<Shield className="h-3 w-3" /> الأدوار
								</p>
								<div className="flex flex-wrap gap-1">
									{user.roles.length ? user.roles.map((r) => (
										<span key={r} className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">{r}</span>
									)) : <span className="text-xs text-gray-400">لا توجد أدوار</span>}
								</div>
							</div>
						</div>
					</div>

					<div className="bg-white rounded-xl border border-gray-200">
						<div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
							<Lock className="h-4 w-4 text-gray-400" />
							<h3 className="text-sm font-semibold text-gray-900">تغيير كلمة المرور</h3>
						</div>
						<form onSubmit={handleChangePassword} className="p-5 space-y-3">
							<div>
								<label className="block text-xs font-medium text-gray-500 mb-1">الحالية</label>
								<input type="password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-500 mb-1">الجديدة</label>
								<input type="password" required minLength={6} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-500 mb-1">تأكيد الجديدة</label>
								<input type="password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm" />
							</div>
							<button type="submit" disabled={saving}
								className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90 disabled:opacity-50">
								{saving && <Loader2 className="h-4 w-4 animate-spin" />}تحديث
							</button>
						</form>
					</div>
				</div>

				<div className="lg:col-span-2">
					<div className="bg-white rounded-xl border border-gray-200">
						<div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
							<div className="flex items-center gap-2">
								<KeyRound className="h-5 w-5 text-gray-400" />
								<h2 className="text-lg font-semibold text-gray-900">صلاحياتي</h2>
							</div>
							<span className="text-sm text-gray-500">
								<span className="font-semibold text-primary">{user.permissions.length}</span> صلاحية
							</span>
						</div>
						<div className="p-6">
							{grouped.length === 0 ? (
								<p className="text-sm text-gray-400 text-center py-8">لا توجد صلاحيات مُعيَّنة</p>
							) : (
								<div className="space-y-5">
									{grouped.map(({ resource, resourceLabel, verbs }) => (
										<div key={resource}>
											<h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
												{resourceLabel}
												<span className="text-[10px] font-normal text-gray-400 font-mono">{resource}</span>
											</h4>
											<div className="flex flex-wrap gap-1.5">
												{verbs.map(({ name, label }) => (
													<span
														key={name}
														className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-primary/5 text-primary border border-primary/20 rounded-full"
														title={name}
													>
														<Check className="h-3 w-3" />
														{label}
													</span>
												))}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					<div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
						<Shield className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
						<div>
							<h4 className="text-sm font-medium text-blue-900">نصيحة أمنية</h4>
							<p className="text-xs text-blue-700 mt-1">
								استخدم كلمة مرور قوية وفريدة، وغيّرها بانتظام. لا تشاركها مع أي شخص.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
