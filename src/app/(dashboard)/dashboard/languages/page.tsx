"use client"

import { useState } from "react"
import type { Language } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { Loader2, Globe, Trash2, Plus, Pencil } from "lucide-react"
import Modal from "@/components/ui/Modal"
import EmptyState from "@/components/ui/EmptyState"
import PageHeader from "@/components/layout/PageHeader"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { TableSkeleton } from "@/components/ui/Skeleton"
import {
	useAllLanguagesList,
	useCreateLanguage,
	useUpdateLanguage,
	useDeleteLanguage,
} from "@/lib/queries/languages"

type DialogState =
	| { mode: "create" }
	| { mode: "edit"; lang: Language }
	| null

export default function LanguagesPage() {
	const { confirm, dialog: confirmDialog } = useConfirm()
	const [dialog, setDialog] = useState<DialogState>(null)

	const listQuery = useAllLanguagesList()
	const languages = (listQuery.data as unknown as Language[]) ?? []
	const isLoading = listQuery.isLoading

	const updateLang = useUpdateLanguage()
	const deleteLang = useDeleteLanguage()

	const toggleActive = (lang: Language) => {
		updateLang.mutate(
			{ code: lang.code, body: { is_active: !lang.is_active } },
			{
				onSuccess: () => toast.success(lang.is_active ? "تم تعطيل اللغة" : "تم تفعيل اللغة"),
				onError: (e) => toast.error(getErrorMessage(e, "فشل تحديث اللغة")),
			},
		)
	}

	const handleDelete = async (lang: Language) => {
		const ok = await confirm({
			title: `حذف اللغة "${lang.native_name || lang.name || lang.code}"؟`,
			description: "ستفقد ترجمات كل المحتوى المرتبط بهذه اللغة. لا يمكن التراجع.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		deleteLang.mutate(lang.code, {
			onSuccess: () => toast.success("تم الحذف"),
			onError: (e) => toast.error(getErrorMessage(e, "فشل حذف اللغة")),
		})
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="اللغات"
				description="إضافة وتعديل اللغات المدعومة في الموقع. كل لغة هنا تصبح متاحة في حقول الترجمة لكل المحتوى."
				icon={Globe}
				actions={
					<button
						onClick={() => setDialog({ mode: "create" })}
						className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
					>
						<Plus className="h-4 w-4" />لغة جديدة
					</button>
				}
			/>

			{isLoading ? (
				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الرمز</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم المحلي</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">إجراءات</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-100"><TableSkeleton rows={3} cols={5} /></tbody>
					</table>
				</div>
			) : languages.length === 0 ? (
				<EmptyState
					variant="card"
					icon={Globe}
					title="لا توجد لغات بعد"
					description="ابدأ بإضافة لغة (مثل العربية أو الإنجليزية). ستظهر مباشرةً في كل حقول الترجمة."
					action={(
						<button onClick={() => setDialog({ mode: "create" })} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90">
							<Plus className="h-4 w-4" />إضافة لغة
						</button>
					)}
				/>
			) : (
				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الرمز</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم المحلي</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">إجراءات</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-100">
							{languages.map((lang) => (
								<tr key={lang.code} className="hover:bg-gray-50">
									<td className="px-6 py-3">
										<div className="flex items-center gap-2">
											<Globe className="h-4 w-4 text-gray-400" />
											<span className="font-mono font-medium text-gray-900">{lang.code}</span>
										</div>
									</td>
									<td className="px-6 py-3 text-sm text-gray-800">{lang.name}</td>
									<td className="px-6 py-3 text-sm text-gray-800">{lang.native_name}</td>
									<td className="px-6 py-3">
										<button
											onClick={() => toggleActive(lang)}
											className={`cursor-pointer px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${lang.is_active ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
											title={lang.is_active ? "اضغط للتعطيل" : "اضغط للتفعيل"}
										>
											{lang.is_active ? "نشطة" : "غير نشطة"}
										</button>
									</td>
									<td className="px-6 py-3 text-left">
										<div className="flex justify-end gap-1">
											<button onClick={() => setDialog({ mode: "edit", lang })} className="cursor-pointer p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded" title="تعديل"><Pencil className="h-4 w-4" /></button>
											<button onClick={() => handleDelete(lang)} className="cursor-pointer p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="حذف"><Trash2 className="h-4 w-4" /></button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{dialog && (
				<LanguageDialog
					state={dialog}
					onClose={() => setDialog(null)}
				/>
			)}
			{confirmDialog}
		</div>
	)
}

function LanguageDialog({ state, onClose }: { state: Exclude<DialogState, null>; onClose: () => void }) {
	const isEdit = state.mode === "edit"
	const existing = isEdit ? state.lang : null
	const [code, setCode] = useState(existing?.code ?? "")
	const [name, setName] = useState(existing?.name ?? "")
	const [nativeName, setNativeName] = useState(existing?.native_name ?? "")
	const [isActive, setIsActive] = useState(existing?.is_active ?? true)

	const createLang = useCreateLanguage()
	const updateLang = useUpdateLanguage()
	const saving = createLang.isPending || updateLang.isPending

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		const trimmedName = name.trim()
		const trimmedNative = nativeName.trim()
		if (!trimmedName || !trimmedNative) {
			toast.error("الاسم والاسم المحلي مطلوبان")
			return
		}
		const handlers = {
			onSuccess: () => { toast.success(isEdit ? "تم تحديث اللغة" : "تمت إضافة اللغة"); onClose() },
			onError: (e: unknown) => toast.error(getErrorMessage(e, isEdit ? "فشل تحديث اللغة" : "فشل إضافة اللغة")),
		}
		if (isEdit && existing) {
			updateLang.mutate(
				{ code: existing.code, body: { name: trimmedName, native_name: trimmedNative, is_active: isActive } },
				handlers,
			)
		} else {
			const trimmedCode = code.trim().toLowerCase()
			if (trimmedCode.length < 2) {
				toast.error("رمز اللغة قصير جداً")
				return
			}
			createLang.mutate(
				{ code: trimmedCode, name: trimmedName, native_name: trimmedNative, is_active: isActive },
				handlers,
			)
		}
	}

	return (
		<Modal open={true} onClose={onClose} title={isEdit ? `تعديل "${existing!.code}"` : "إضافة لغة"} size="md">
			<form onSubmit={handleSubmit}>
				<div className="p-6 space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-800 mb-1.5">رمز اللغة (ISO 639-1)</label>
						<input
							required
							value={code}
							onChange={(e) => setCode(e.target.value)}
							dir="ltr"
							readOnly={isEdit}
							maxLength={10}
							placeholder="ar"
							className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary font-mono text-sm ${isEdit ? "bg-gray-50 text-gray-500" : ""}`}
						/>
						<p className="mt-1 text-[11px] text-gray-500">
							حرفان لاتينيان من معيار ISO 639-1 (مثل ar، en، fr). لا يمكن تعديله بعد الإنشاء.
						</p>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-800 mb-1.5">الاسم بالإنجليزية (name)</label>
						<input
							required
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Arabic"
							dir="ltr"
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
						/>
						<p className="mt-1 text-[11px] text-gray-500">يستخدمه لوحة الإدارة لعرض اللغة باللغة الإنجليزية.</p>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-800 mb-1.5">الاسم المحلي (native_name)</label>
						<input
							required
							value={nativeName}
							onChange={(e) => setNativeName(e.target.value)}
							placeholder="العربية"
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
						/>
						<p className="mt-1 text-[11px] text-gray-500">الاسم كما يكتب أهل اللغة (مثل: العربية، English، Français).</p>
					</div>
					<label className="flex items-center gap-2 cursor-pointer">
						<input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 text-primary rounded" />
						<span className="text-sm text-gray-900">نشطة (متاحة في الترجمات)</span>
					</label>
				</div>
				<div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-200 bg-gray-50">
					<button type="button" onClick={onClose} className="cursor-pointer px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-white">إلغاء</button>
					<button type="submit" disabled={saving} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50">
						{saving && <Loader2 className="h-4 w-4 animate-spin" />}{isEdit ? "حفظ" : "إضافة"}
					</button>
				</div>
			</form>
		</Modal>
	)
}
