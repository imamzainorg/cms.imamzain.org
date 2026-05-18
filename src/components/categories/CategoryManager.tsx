"use client"

import { useState } from "react"
import type { AxiosResponse } from "axios"
import {
	useMutation,
	useQuery,
	useQueryClient,
	type QueryKey,
} from "@tanstack/react-query"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { categoryName, slugify } from "@/lib/i18n"
import { useActiveLanguages, languageLabel } from "@/lib/useLanguages"
import { Plus, Trash2, Pencil, Loader2, Tag, X, Globe } from "lucide-react"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import type { PaginatedResponse, CategoryTranslation } from "@/types"

type GenericCategory = {
	id: string
	created_at: string
	[key: string]: unknown
}

type Service<T extends GenericCategory> = {
	list: (params?: { page?: number; limit?: number }) => Promise<AxiosResponse<PaginatedResponse<T>>>
	create: (body: { translations: CategoryTranslation[] }) => Promise<AxiosResponse<T>>
	update: (id: string, body: { translations: CategoryTranslation[] }) => Promise<AxiosResponse<T>>
	remove: (id: string) => Promise<AxiosResponse<unknown>>
}

type Props<T extends GenericCategory> = {
	title: string
	singular: string
	service: Service<T>
	/** Root query key for this resource. The manager invalidates everything under it after mutations. */
	queryKey: QueryKey
	/** Field name on the category object that holds the translations array. */
	translationsField: keyof T
	/** Optional link to the trash page; renders a "سلة المهملات" button next to "new". */
	trashHref?: string
}

export default function CategoryManager<T extends GenericCategory>({
	title,
	singular,
	service,
	trashHref,
	queryKey,
	translationsField,
}: Props<T>) {
	const qc = useQueryClient()
	const { confirm, dialog } = useConfirm()
	const [editing, setEditing] = useState<T | null>(null)
	const [creating, setCreating] = useState(false)

	const listQuery = useQuery({
		queryKey: [...queryKey, "list", { limit: 100 }],
		queryFn: async () => (await service.list({ limit: 100 })).data,
	})
	const items = listQuery.data?.items ?? []
	const loading = listQuery.isLoading

	const createMutation = useMutation({
		mutationFn: (body: { translations: CategoryTranslation[] }) => service.create(body),
		onSuccess: () => qc.invalidateQueries({ queryKey }),
	})

	const updateMutation = useMutation({
		mutationFn: ({ id, body }: { id: string; body: { translations: CategoryTranslation[] } }) =>
			service.update(id, body),
		onSuccess: () => qc.invalidateQueries({ queryKey }),
	})

	const deleteMutation = useMutation({
		mutationFn: (id: string) => service.remove(id),
		onSuccess: () => qc.invalidateQueries({ queryKey }),
	})

	const handleDelete = async (id: string) => {
		const ok = await confirm({
			title: `حذف هذا ${singular}؟`,
			description: "سيفشل الحذف إذا كان التصنيف مرتبطاً بمحتوى. لا يمكن التراجع.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		deleteMutation.mutate(id, {
			onSuccess: () => toast.success("تم الحذف"),
			onError: (e) => toast.error(getErrorMessage(e, "تعذّر الحذف")),
		})
	}

	const getTranslations = (item: T): CategoryTranslation[] => {
		const v = item[translationsField]
		return Array.isArray(v) ? (v as CategoryTranslation[]) : []
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		)
	}

	return (
		<div>
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-3xl font-bold text-gray-900">{title}</h1>
				<div className="flex gap-2">
					{trashHref && (
						<a
							href={trashHref}
							className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
						>
							<Trash2 className="h-4 w-4" />سلة المهملات
						</a>
					)}
					<button
						onClick={() => setCreating(true)}
						className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
					>
						<Plus className="h-4 w-4" />
						{singular} جديد
					</button>
				</div>
			</div>

			{items.length === 0 ? (
				<div className="bg-white shadow-sm rounded-xl p-12 text-center text-gray-500">
					<Tag className="h-12 w-12 mx-auto mb-3 text-gray-300" />
					<p>لا توجد تصنيفات بعد. أضف الأول للبدء.</p>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{items.map((item) => {
						const ts = getTranslations(item)
						const name = categoryName(ts)
						return (
							<div
								key={item.id}
								className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
								onClick={() => setEditing(item)}
							>
								<div className="flex items-start justify-between mb-3">
									<div className="min-w-0 flex-1">
										<h3 className="font-semibold text-gray-900 text-lg truncate">{name}</h3>
										<p className="text-xs text-gray-500 mt-0.5">{ts.length} {ts.length === 1 ? "ترجمة" : "ترجمات"}</p>
									</div>
									<div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
										<button
											onClick={() => setEditing(item)}
											className="cursor-pointer p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded"
											title="تعديل"
										>
											<Pencil className="h-4 w-4" />
										</button>
										<button
											onClick={() => handleDelete(item.id)}
											className="cursor-pointer p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
											title="حذف"
										>
											<Trash2 className="h-4 w-4" />
										</button>
									</div>
								</div>
								<div className="flex flex-wrap gap-1">
									{ts.map((t) => (
										<span
											key={t.lang}
											className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600"
										>
											{languageLabel(t.lang)}
										</span>
									))}
								</div>
							</div>
						)
					})}
				</div>
			)}

			{(creating || editing) && (
				<CategoryDialog
					initial={editing ? getTranslations(editing) : undefined}
					singular={singular}
					onClose={() => { setCreating(false); setEditing(null) }}
					onSave={(translations) => new Promise<void>((resolve, reject) => {
						const handlers = {
							onSuccess: () => {
								toast.success(editing ? "تم تحديث التصنيف" : "تم إنشاء التصنيف")
								setCreating(false)
								setEditing(null)
								resolve()
							},
							onError: (e: unknown) => {
								toast.error(getErrorMessage(e, "فشل الحفظ"))
								reject(e)
							},
						}
						if (editing) {
							updateMutation.mutate({ id: editing.id, body: { translations } }, handlers)
						} else {
							createMutation.mutate({ translations }, handlers)
						}
					})}
				/>
			)}
			{dialog}
		</div>
	)
}

function CategoryDialog({
	initial,
	singular,
	onClose,
	onSave,
}: {
	initial?: CategoryTranslation[]
	singular: string
	onClose: () => void
	onSave: (translations: CategoryTranslation[]) => Promise<void>
}) {
	const { languages } = useActiveLanguages()
	const [translations, setTranslations] = useState<CategoryTranslation[]>(
		initial && initial.length
			? initial.map((t) => ({ ...t }))
			: [{ lang: "ar", title: "", slug: "" }]
	)
	const [saving, setSaving] = useState(false)

	const updateT = (i: number, patch: Partial<CategoryTranslation>) => {
		setTranslations((prev) => {
			const next = [...prev]
			next[i] = { ...next[i], ...patch }
			if (patch.title !== undefined && !next[i].slug) {
				next[i].slug = slugify(patch.title)
			}
			return next
		})
	}

	const addLang = () => {
		const used = translations.map((t) => t.lang)
		const next = languages.find((l) => !used.includes(l.code))
		if (!next) {
			toast.error("لا توجد لغات إضافية متاحة")
			return
		}
		setTranslations((prev) => [...prev, { lang: next.code, title: "", slug: "" }])
	}

	const removeLang = (i: number) => {
		setTranslations((prev) => prev.filter((_, idx) => idx !== i))
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		const cleaned = translations
			.filter((t) => t.title.trim())
			.map((t) => ({ ...t, slug: t.slug || slugify(t.title) }))
		if (!cleaned.length) {
			toast.error("أضف اسماً واحداً على الأقل")
			return
		}
		setSaving(true)
		try { await onSave(cleaned) } catch { /* already toasted */ }
		finally { setSaving(false) }
	}

	const langOptions = languages.length
		? languages
		: [{ code: "ar", name: "Arabic", native_name: "العربية", is_active: true }]

	return (
		<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
			<div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
				<form onSubmit={handleSubmit}>
					<div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
						<h2 className="text-lg font-semibold text-gray-900">
							{initial ? `تعديل ${singular}` : `${singular} جديد`}
						</h2>
						<button type="button" onClick={onClose} className="cursor-pointer p-1 rounded-md hover:bg-gray-100">
							<X className="h-5 w-5 text-gray-500" />
						</button>
					</div>
					<div className="p-6 space-y-3">
						{translations.map((t, i) => (
							<div key={i} className="p-3 border border-gray-200 rounded-lg bg-gray-50/40 space-y-2">
								<div className="flex items-center gap-2">
									<div className="relative w-32 shrink-0">
										<Globe className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
										<select
											value={t.lang}
											onChange={(e) => updateT(i, { lang: e.target.value })}
											className="cursor-pointer w-full pr-8 pl-2 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
										>
											{langOptions.map((l) => (
												<option key={l.code} value={l.code}>{languageLabel(l.code, l.native_name)}</option>
											))}
										</select>
									</div>
									<div className="flex-1">
										<input
											value={t.title}
											onChange={(e) => updateT(i, { title: e.target.value })}
											dir={t.lang === "ar" ? "rtl" : "ltr"}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
											placeholder="اسم التصنيف"
										/>
									</div>
									{translations.length > 1 && (
										<button
											type="button"
											onClick={() => removeLang(i)}
											className="cursor-pointer p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
										>
											<Trash2 className="h-4 w-4" />
										</button>
									)}
								</div>
								<details className="text-xs">
									<summary className="text-gray-500 cursor-pointer hover:text-gray-700 select-none px-1">الرابط المختصر (slug)</summary>
									<input
										value={t.slug ?? ""}
										onChange={(e) => updateT(i, { slug: e.target.value })}
										dir="ltr"
										className="mt-1 w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-primary focus:border-primary font-mono text-xs"
									/>
									<p className="mt-1 text-[11px] text-gray-400">يُولَّد تلقائياً من الاسم. عدّله فقط إن كنت تعرف ماذا تفعل.</p>
								</details>
							</div>
						))}
						<button
							type="button"
							onClick={addLang}
							className="cursor-pointer w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-primary hover:text-primary"
						>
							<Plus className="inline h-4 w-4 ml-1" /> إضافة لغة أخرى
						</button>
					</div>
					<div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-200">
						<button
							type="button"
							onClick={onClose}
							className="cursor-pointer px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
						>
							إلغاء
						</button>
						<button
							type="submit"
							disabled={saving}
							className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
						>
							{saving && <Loader2 className="h-4 w-4 animate-spin" />}
							حفظ
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}
