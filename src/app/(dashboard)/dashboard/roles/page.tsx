"use client"

import { useEffect, useState, useMemo } from "react"
import type { Role, Permission } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { Plus, Trash2, Loader2, Shield, Check, Search, Pencil, KeyRound } from "lucide-react"
import EmptyState from "@/components/ui/EmptyState"
import Modal from "@/components/ui/Modal"
import PageHeader from "@/components/layout/PageHeader"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { ListSkeleton, Skeleton } from "@/components/ui/Skeleton"
import { humanizeResource } from "@/lib/humanize"
import {
	useRolesList,
	usePermissionsList,
	useCreateRole,
	useUpdateRole,
	useDeleteRole,
	useTogglePermission,
} from "@/lib/queries/roles"

const ACTION_LABELS: Record<string, string> = {
	create: "إنشاء",
	read: "قراءة",
	update: "تعديل",
	delete: "حذف",
	publish: "نشر",
	unpublish: "إلغاء نشر",
	upload: "رفع",
	manage: "إدارة كاملة",
	assign: "تعيين",
	approve: "موافقة",
	reject: "رفض",
	export: "تصدير",
	import: "استيراد",
}

function humanizeAction(action: string): string {
	return ACTION_LABELS[action.toLowerCase()] ?? action
}

export default function RolesPage() {
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [permSearch, setPermSearch] = useState("")
	const [showCreate, setShowCreate] = useState(false)
	const [editing, setEditing] = useState<Role | null>(null)
	const { confirm, dialog } = useConfirm()

	const rolesQuery = useRolesList()
	const permissionsQuery = usePermissionsList()
	const roles = useMemo(() => rolesQuery.data?.items ?? [], [rolesQuery.data])
	const permissions = useMemo(() => permissionsQuery.data?.items ?? [], [permissionsQuery.data])
	const loading = rolesQuery.isLoading || permissionsQuery.isLoading

	const togglePerm = useTogglePermission()
	const deleteRole = useDeleteRole()

	useEffect(() => {
		if (rolesQuery.error) toast.error(getErrorMessage(rolesQuery.error, "فشل التحميل"))
		if (permissionsQuery.error) toast.error(getErrorMessage(permissionsQuery.error, "فشل تحميل الصلاحيات"))
	}, [rolesQuery.error, permissionsQuery.error])

	const selected = roles.find((r) => r.id === selectedId) || roles[0] || null

	const groups = useMemo(() => {
		const filtered = permissions.filter(
			(p) => !permSearch || p.name.toLowerCase().includes(permSearch.toLowerCase())
		)
		const map: Record<string, Permission[]> = {}
		for (const p of filtered) {
			const [resource = "أخرى"] = p.name.split(":")
			if (!map[resource]) map[resource] = []
			map[resource].push(p)
		}
		return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
	}, [permissions, permSearch])

	const selectedPerms = selected?.permissions ?? []

	const handleToggle = (permission: Permission, has: boolean) => {
		if (!selected) return
		togglePerm.mutate(
			{ roleId: selected.id, permission, has },
			{ onError: (e) => toast.error(getErrorMessage(e, "فشل تحديث الصلاحية")) },
		)
	}

	const handleDelete = async (role: Role) => {
		const ok = await confirm({
			title: `حذف الدور "${roleTitle(role)}"؟`,
			description: "سيفشل الحذف إذا كان الدور مُعيَّناً لمستخدمين. أزل التعيين أولاً من صفحة المستخدمين.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		deleteRole.mutate(role.id, {
			onSuccess: () => {
				toast.success("تم حذف الدور")
				if (selectedId === role.id) setSelectedId(null)
			},
			onError: (e) => toast.error(getErrorMessage(e, "تعذّر الحذف — قد يكون مُعيَّناً لمستخدمين")),
		})
	}

	const roleTitle = (r: Role) =>
		r.role_translations.find((t) => t.lang === "ar")?.title ||
		r.role_translations[0]?.title ||
		r.name

	if (loading) {
		return (
			<div className="space-y-6">
				<PageHeader
					title="الأدوار والصلاحيات"
					description="عرّف أدواراً (مثل محرّر، مدير) وحدّد ما يستطيع كل دور فعله."
					icon={Shield}
				/>
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
					<div className="lg:col-span-4 bg-white border border-gray-200 rounded-xl overflow-hidden">
						<div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
							<Skeleton className="h-3 w-32" />
						</div>
						<ListSkeleton rows={4} />
					</div>
					<div className="lg:col-span-8 bg-white border border-gray-200 rounded-xl p-5 space-y-4">
						<Skeleton className="h-6 w-1/3" />
						<Skeleton className="h-9 w-full" />
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
						</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="الأدوار والصلاحيات"
				description="عرّف أدواراً (مثل محرّر، مدير) وحدّد ما يستطيع كل دور فعله."
				icon={Shield}
				actions={
					<button onClick={() => setShowCreate(true)} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
						<Plus className="h-4 w-4" />دور جديد
					</button>
				}
			/>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				<div className="lg:col-span-4 bg-white border border-gray-200 rounded-xl overflow-hidden">
					<div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
						<h3 className="text-sm font-semibold text-gray-700">الأدوار ({roles.length})</h3>
					</div>
					<div className="max-h-[calc(100vh-220px)] overflow-y-auto">
						{roles.length === 0 ? (
							<EmptyState
								icon={Shield}
								title="لا توجد أدوار بعد"
								description="أنشئ دوراً مثل محرّر أو مدير، ثم حدّد صلاحياته."
								action={(
									<button onClick={() => setShowCreate(true)} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90">
										<Plus className="h-4 w-4" />دور جديد
									</button>
								)}
							/>
						) : roles.map((role) => {
							const isSel = selectedId === role.id
							return (
								<button
									key={role.id}
									onClick={() => setSelectedId(role.id)}
									className={`w-full text-right p-4 border-b border-gray-100 last:border-0 transition-colors ${isSel ? "bg-primary/5 border-r-4 border-r-primary" : "hover:bg-gray-50"}`}
								>
									<div className="flex items-start justify-between gap-2">
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<Shield className={`h-4 w-4 shrink-0 ${isSel ? "text-primary" : "text-gray-400"}`} />
												<span className="font-medium text-gray-900 text-sm truncate">{roleTitle(role)}</span>
											</div>
											<p className="text-xs text-gray-500 mt-1 font-mono truncate">{role.name}</p>
										</div>
										<div className="flex flex-col items-end gap-1 shrink-0">
											<span className="text-[10px] px-1.5 py-0.5 bg-secondary/15 text-secondary rounded-full whitespace-nowrap">
												{(role.permissions?.length ?? 0)} صلاحية
											</span>
											<div className="flex gap-1">
												<span
													role="button"
													tabIndex={0}
													onClick={(e) => { e.stopPropagation(); setEditing(role) }}
													onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setEditing(role) } }}
													className="p-1 text-gray-400 hover:text-primary"
												>
													<Pencil className="h-3.5 w-3.5" />
												</span>
												<span
													role="button"
													tabIndex={0}
													onClick={(e) => { e.stopPropagation(); handleDelete(role) }}
													onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); handleDelete(role) } }}
													className="p-1 text-gray-400 hover:text-red-600 cursor-pointer"
												>
													<Trash2 className="h-3.5 w-3.5" />
												</span>
											</div>
										</div>
									</div>
								</button>
							)
						})}
					</div>
				</div>

				<div className="lg:col-span-8 bg-white border border-gray-200 rounded-xl overflow-hidden">
					{!selected ? (
						<EmptyState
							icon={KeyRound}
							title="اختر دوراً"
							description="اختر دوراً من القائمة على اليمين لإدارة صلاحياته."
							className="py-12!"
						/>
					) : (
						<>
							<div className="px-5 py-4 border-b border-gray-100 bg-linear-to-l from-primary/5 to-transparent">
								<div className="flex items-center justify-between mb-3">
									<div>
										<h2 className="text-lg font-semibold text-gray-900">{roleTitle(selected)}</h2>
										<p className="text-xs text-gray-500 font-mono mt-0.5">{selected.name}</p>
									</div>
									<div className="text-sm text-gray-600">
										<span className="font-semibold text-primary">{selectedPerms.length}</span> / {permissions.length} صلاحية
									</div>
								</div>
								<div className="relative">
									<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
									<input
										value={permSearch}
										onChange={(e) => setPermSearch(e.target.value)}
										placeholder="ابحث بالصلاحية..."
										className="w-full pr-9 pl-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
									/>
								</div>
							</div>
							<div className="p-5 max-h-[calc(100vh-300px)] overflow-y-auto space-y-5">
								{groups.length === 0 ? (
									<p className="text-center text-sm text-gray-500 py-6">لا توجد صلاحيات تطابق البحث</p>
								) : groups.map(([resource, perms]) => {
									const all = perms.length
									const owned = perms.filter((p) => selectedPerms.some((pp) => pp.id === p.id)).length
									return (
										<div key={resource}>
											<div className="flex items-center justify-between mb-2">
												<h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
													<span className="px-2 py-0.5 bg-primary/5 text-primary rounded">{humanizeResource(resource)}</span>
													<span className="text-xs text-gray-400">{owned}/{all}</span>
												</h4>
											</div>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
												{perms.map((perm) => {
													const has = selectedPerms.some((p) => p.id === perm.id)
													const isWorking =
														togglePerm.isPending &&
														togglePerm.variables?.permission.id === perm.id
													const action = perm.name.includes(":") ? perm.name.split(":")[1] : perm.name
													return (
														<button
															key={perm.id}
															disabled={isWorking}
															onClick={() => handleToggle(perm, has)}
															className={`cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors disabled:opacity-50 ${has ? "border-primary/30 bg-primary/5 text-primary" : "border-gray-200 hover:border-gray-300 text-gray-700"}`}
														>
															<div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${has ? "bg-primary border-primary" : "border-gray-300"}`}>
																{has && <Check className="h-3 w-3 text-white" />}
																{isWorking && <Loader2 className="h-3 w-3 animate-spin" />}
															</div>
															<span>{humanizeAction(action)}</span>
														</button>
													)
												})}
											</div>
										</div>
									)
								})}
							</div>
						</>
					)}
				</div>
			</div>

			{(showCreate || editing) && (
				<RoleDialog
					initial={editing}
					onClose={() => { setShowCreate(false); setEditing(null) }}
					onSaved={() => { setShowCreate(false); setEditing(null) }}
				/>
			)}
			{dialog}
		</div>
	)
}

function RoleDialog({
	initial,
	onClose,
	onSaved,
}: {
	initial: Role | null
	onClose: () => void
	onSaved: () => void
}) {
	const [name, setName] = useState(initial?.name ?? "")
	const [title, setTitle] = useState(
		initial?.role_translations.find((t) => t.lang === "ar")?.title ??
		initial?.role_translations[0]?.title ?? ""
	)
	const [description, setDescription] = useState(
		initial?.role_translations.find((t) => t.lang === "ar")?.description ?? ""
	)

	const createRole = useCreateRole()
	const updateRole = useUpdateRole()
	const saving = createRole.isPending || updateRole.isPending

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		const body = {
			name,
			translations: [{ lang: "ar", title, description: description || undefined }],
		}
		const handlers = {
			onSuccess: () => {
				toast.success(initial ? "تم تحديث الدور" : "تم إنشاء الدور")
				onSaved()
			},
			onError: (e: unknown) => toast.error(getErrorMessage(e, "فشل الحفظ")),
		}
		if (initial) {
			updateRole.mutate({ id: initial.id, body }, handlers)
		} else {
			createRole.mutate(body, handlers)
		}
	}

	return (
		<Modal open={true} onClose={onClose} title={initial ? "تعديل الدور" : "دور جديد"} size="md">
			<form onSubmit={handleSubmit}>
				<div className="p-6 space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">المعرّف (slug)</label>
						<input required value={name} onChange={(e) => setName(e.target.value)} dir="ltr" placeholder="editor"
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary font-mono" />
						<p className="mt-1 text-xs text-gray-500">معرّف داخلي بالحروف اللاتينية (مثل editor، admin)</p>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالعربية</label>
						<input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="محرّر"
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
						<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="وصف اختياري للدور"
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
					</div>
				</div>
				<div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-200 bg-gray-50">
					<button type="button" onClick={onClose} className="cursor-pointer px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">إلغاء</button>
					<button type="submit" disabled={saving} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50">
						{saving && <Loader2 className="h-4 w-4 animate-spin" />}حفظ
					</button>
				</div>
			</form>
		</Modal>
	)
}
