"use client"

import { useEffect, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import type { UserSummary } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import EmptyState from "@/components/ui/EmptyState"
import Modal from "@/components/ui/Modal"
import PageHeader from "@/components/layout/PageHeader"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { TableSkeleton } from "@/components/ui/Skeleton"
import {
	Plus, Trash2, Loader2, Users as UsersIcon, X, Shield, Pencil, Search, Power,
	Check, UserPlus, KeyRound,
} from "lucide-react"
import { safeFormat } from "@/lib/dates"
import {
	useUsersList,
	useCreateUser,
	useUpdateUser,
	useDeleteUser,
	useAssignUserRole,
	useRemoveUserRole,
} from "@/lib/queries/users"
import { useRolesList } from "@/lib/queries/roles"
import { authService } from "@/services/auth.service"

export default function UsersPage() {
	const [showCreate, setShowCreate] = useState(false)
	const [editing, setEditing] = useState<UserSummary | null>(null)
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [search, setSearch] = useState("")
	const { confirm, dialog } = useConfirm()

	const [createForm, setCreateForm] = useState({ username: "", password: "" })
	const [editForm, setEditForm] = useState({ username: "", is_active: true })
	const [pendingRoleId, setPendingRoleId] = useState<string | null>(null)
	const [resettingUser, setResettingUser] = useState<UserSummary | null>(null)
	const [newPassword, setNewPassword] = useState("")

	const resetPasswordMutation = useMutation({
		mutationFn: ({ userId, new_password }: { userId: string; new_password: string }) =>
			authService.adminResetPassword(userId, new_password),
	})

	const handleResetPassword = (e: React.FormEvent) => {
		e.preventDefault()
		if (!resettingUser) return
		if (newPassword.length < 6) {
			toast.error("كلمة المرور يجب ألا تقل عن ٦ أحرف")
			return
		}
		resetPasswordMutation.mutate(
			{ userId: resettingUser.id, new_password: newPassword },
			{
				onSuccess: () => {
					toast.success(`تم تعيين كلمة المرور الجديدة لـ ${resettingUser.username}. سيُسجَّل خروجه من كل الجلسات.`)
					setResettingUser(null)
					setNewPassword("")
				},
				onError: (e) => toast.error(getErrorMessage(e, "فشل تعيين كلمة المرور")),
			},
		)
	}

	const usersQuery = useUsersList({ limit: 100 })
	const rolesQuery = useRolesList()
	const users = usersQuery.data?.items ?? []
	const roles = rolesQuery.data?.items ?? []
	const isLoading = usersQuery.isLoading || rolesQuery.isLoading

	const createUser = useCreateUser()
	const updateUser = useUpdateUser()
	const deleteUser = useDeleteUser()
	const assignRoleMutation = useAssignUserRole()
	const removeRoleMutation = useRemoveUserRole()
	const isSaving = createUser.isPending || updateUser.isPending

	useEffect(() => {
		if (usersQuery.error) toast.error(getErrorMessage(usersQuery.error, "فشل تحميل المستخدمين"))
	}, [usersQuery.error])

	const handleCreate = (e: React.FormEvent) => {
		e.preventDefault()
		createUser.mutate(createForm, {
			onSuccess: () => {
				toast.success("تم إنشاء المستخدم")
				setCreateForm({ username: "", password: "" })
				setShowCreate(false)
			},
			onError: (e) => toast.error(getErrorMessage(e, "فشل إنشاء المستخدم")),
		})
	}

	const handleEdit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!editing) return
		updateUser.mutate(
			{ id: editing.id, body: editForm },
			{
				onSuccess: () => { toast.success("تم التحديث"); setEditing(null) },
				onError: (e) => toast.error(getErrorMessage(e, "فشل التحديث")),
			},
		)
	}

	const startEdit = (u: UserSummary) => {
		setEditing(u)
		setEditForm({ username: u.username, is_active: u.is_active })
	}

	const handleDelete = async (u: UserSummary) => {
		const ok = await confirm({
			title: `حذف المستخدم "${u.username}"؟`,
			description: "لن يستطيع تسجيل الدخول. هذا الإجراء نهائي ولا يمكن التراجع.",
			confirmText: "حذف نهائي",
			tone: "danger",
		})
		if (!ok) return
		deleteUser.mutate(u.id, {
			onSuccess: () => toast.success("تم الحذف"),
			onError: (e) => toast.error(getErrorMessage(e, "فشل الحذف")),
		})
	}

	const toggleActive = async (u: UserSummary) => {
		if (u.is_active) {
			const ok = await confirm({
				title: `تعطيل "${u.username}"؟`,
				description: "لن يستطيع المستخدم تسجيل الدخول حتى تقوم بإعادة تفعيله.",
				confirmText: "تعطيل",
				tone: "warning",
			})
			if (!ok) return
		}
		updateUser.mutate(
			{ id: u.id, body: { is_active: !u.is_active } },
			{
				onSuccess: () => toast.success(u.is_active ? "تم التعطيل" : "تم التفعيل"),
				onError: (e) => toast.error(getErrorMessage(e, "فشل التحديث")),
			},
		)
	}

	const assignRole = (userId: string, roleId: string) => {
		setPendingRoleId(roleId)
		assignRoleMutation.mutate(
			{ userId, roleId },
			{
				onSuccess: () => toast.success("تم إضافة الدور"),
				onError: (e) => toast.error(getErrorMessage(e, "فشل إضافة الدور")),
				onSettled: () => setPendingRoleId(null),
			},
		)
	}

	const removeRole = (userId: string, roleId: string) => {
		setPendingRoleId(roleId)
		removeRoleMutation.mutate(
			{ userId, roleId },
			{
				onSuccess: () => toast.success("تمت إزالة الدور"),
				onError: (e) => toast.error(getErrorMessage(e, "فشل إزالة الدور")),
				onSettled: () => setPendingRoleId(null),
			},
		)
	}

	// Derive `selected` from the live users list so it stays in sync with refetches
	const selected = selectedId ? users.find((u) => u.id === selectedId) ?? null : null

	const filtered = users.filter((u) => !search || u.username.toLowerCase().includes(search.toLowerCase()))

	return (
		<div className="space-y-6">
			<PageHeader
				title="المستخدمون"
				description="أنشئ حسابات للمحررين وحدّد صلاحياتهم عبر الأدوار."
				icon={UsersIcon}
				actions={
					<button onClick={() => setShowCreate(true)} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
						<Plus className="h-4 w-4" />مستخدم جديد
					</button>
				}
			/>

			<div className="relative max-w-md group">
				<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
				<input
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="ابحث باسم المستخدم..."
					className="w-full pr-9 pl-3 py-2 text-sm bg-white border border-gray-200 rounded-lg shadow-soft focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
				/>
			</div>

			<Modal open={showCreate} onClose={() => setShowCreate(false)} title="إنشاء مستخدم جديد" size="md">
				<form onSubmit={handleCreate} className="p-6 space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
						<input required minLength={3} value={createForm.username} onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
							className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-soft focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
						<input type="password" required minLength={6} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
							className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-soft focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
						<p className="mt-1 text-xs text-gray-500">٦ أحرف على الأقل.</p>
					</div>
					<div className="flex justify-end gap-2 pt-2">
						<button type="button" onClick={() => setShowCreate(false)} className="cursor-pointer px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">إلغاء</button>
						<button type="submit" disabled={isSaving} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90 disabled:opacity-50">
							{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}إنشاء
						</button>
					</div>
				</form>
			</Modal>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 bg-white shadow-soft rounded-2xl border border-gray-200 overflow-hidden">
					{isLoading ? (
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50/80 border-b border-gray-200">
								<tr>
									<th className="px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">المستخدم</th>
									<th className="px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">الأدوار</th>
									<th className="px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">الحالة</th>
									<th className="px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">منذ</th>
									<th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">إجراءات</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200"><TableSkeleton rows={5} cols={5} /></tbody>
						</table>
					) : filtered.length === 0 ? (
						<EmptyState
							icon={UsersIcon}
							title={search ? "لا يوجد مستخدمون مطابقون" : "لا يوجد مستخدمون بعد"}
							description={search ? "جرّب اسم مستخدم مختلفاً." : "أنشئ أول حساب محرر للبدء."}
							action={!search && (
								<button onClick={() => setShowCreate(true)} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90">
									<Plus className="h-4 w-4" />مستخدم جديد
								</button>
							)}
						/>
					) : (
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50/80 border-b border-gray-200">
								<tr>
									<th className="px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">المستخدم</th>
									<th className="px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">الأدوار</th>
									<th className="px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">الحالة</th>
									<th className="px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">منذ</th>
									<th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">إجراءات</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-100">
								{filtered.map((u) => (
									<tr key={u.id} onClick={() => setSelectedId(u.id)}
										className={`cursor-pointer transition-colors ${selected?.id === u.id ? "bg-primary/4" : "hover:bg-gray-50/70"}`}>
										<td className="px-6 py-3.5">
											<div className="flex items-center gap-3">
												<div className="w-9 h-9 rounded-full bg-linear-to-br from-primary to-primary/70 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-soft">
													{u.username[0]?.toUpperCase()}
												</div>
												<span className="text-sm font-medium text-gray-900">{u.username}</span>
											</div>
										</td>
										<td className="px-6 py-3.5">
											<div className="flex flex-wrap gap-1">
												{(u.user_roles ?? []).map((ur) => (
													<span key={ur.roles.id} className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-medium rounded-full ring-1 ring-inset ring-primary/20">{ur.roles.name}</span>
												))}
												{!(u.user_roles ?? []).length && <span className="text-xs text-gray-400 italic">لا أدوار</span>}
											</div>
										</td>
										<td className="px-6 py-3.5">
											<span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-full ring-1 ring-inset ${u.is_active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-red-50 text-red-700 ring-red-200"}`}>
												<span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
												{u.is_active ? "نشط" : "معطّل"}
											</span>
										</td>
										<td className="px-6 py-3.5 text-sm text-gray-500 tabular-nums">{safeFormat(u.created_at, "dd/MM/yyyy")}</td>
										<td className="px-6 py-3.5 text-left">
											<div className="flex items-center justify-end gap-1.5">
												<button onClick={(e) => { e.stopPropagation(); toggleActive(u) }} className="cursor-pointer p-1.5 rounded-md transition-colors text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--warning-foreground))] hover:bg-[hsl(var(--warning-soft))]" title={u.is_active ? "تعطيل الحساب" : "تفعيل الحساب"} aria-label={u.is_active ? "تعطيل الحساب" : "تفعيل الحساب"}><Power className="h-4 w-4" strokeWidth={1.6} /></button>
												<button onClick={(e) => { e.stopPropagation(); setResettingUser(u); setNewPassword("") }} className="cursor-pointer p-1.5 rounded-md transition-colors text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--info-foreground))] hover:bg-[hsl(var(--info-soft))]" title="تعيين كلمة مرور جديدة" aria-label="تعيين كلمة مرور جديدة"><KeyRound className="h-4 w-4" strokeWidth={1.6} /></button>
												<button onClick={(e) => { e.stopPropagation(); startEdit(u) }} className="cursor-pointer p-1.5 rounded-md transition-colors text-[hsl(var(--foreground-muted))] hover:text-primary hover:bg-[hsl(var(--primary)/0.08)]" title="تعديل" aria-label="تعديل"><Pencil className="h-4 w-4" strokeWidth={1.6} /></button>
												<button onClick={(e) => { e.stopPropagation(); handleDelete(u) }} className="cursor-pointer p-1.5 rounded-md transition-colors text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-soft))]" title="حذف" aria-label="حذف"><Trash2 className="h-4 w-4" strokeWidth={1.6} /></button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>

				<div className="bg-white shadow-soft rounded-2xl border border-gray-200 p-6 h-fit lg:sticky lg:top-4">
					{!selected ? (
						<EmptyState
							icon={Shield}
							title="إدارة الأدوار"
							description="اختر مستخدماً من القائمة لإضافة أو إزالة أدواره."
							className="py-8!"
						/>
					) : (
						<>
							<div className="flex justify-between items-center mb-3">
								<div className="flex items-center gap-2">
									<div className="h-6 w-1 rounded-full bg-linear-to-b from-primary to-primary/40" />
									<h3 className="text-base font-semibold text-gray-900">الأدوار</h3>
								</div>
								<button onClick={() => setSelectedId(null)} aria-label="إغلاق" className="cursor-pointer p-1 rounded-md hover:bg-gray-100 transition-colors">
									<X className="h-4 w-4 text-gray-400" />
								</button>
							</div>
							<div className="flex items-center gap-2.5 mb-4 p-2.5 rounded-xl bg-gray-50/80 border border-gray-100">
								<div className="w-8 h-8 rounded-full bg-linear-to-br from-primary to-primary/70 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-soft">
									{selected.username[0]?.toUpperCase()}
								</div>
								<p className="text-sm font-medium text-gray-800 truncate">{selected.username}</p>
							</div>
							<p className="text-xs text-gray-500 mb-3 leading-relaxed">
								اضغط على دور لإضافته. اضغط دور موجود لإزالته.
							</p>
							{roles.length === 0 ? (
								<p className="text-sm text-gray-500 py-4 text-center">لا توجد أدوار معرّفة بعد.</p>
							) : (
								<div className="space-y-1.5">
									{roles.map((role) => {
										const has = (selected.user_roles ?? []).some((ur) => ur.roles.id === role.id)
										const isPending = pendingRoleId === role.id
										return (
											<button
												key={role.id}
												disabled={isPending}
												onClick={() => has ? removeRole(selected.id, role.id) : assignRole(selected.id, role.id)}
												className={`group cursor-pointer w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all disabled:opacity-50 ${
													has
														? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 hover:bg-red-50 hover:text-red-700 hover:ring-red-200"
														: "border border-dashed border-gray-200 hover:bg-primary/5 hover:border-primary/40 text-gray-700"
												}`}
												title={has ? "إزالة الدور" : "إضافة الدور"}
											>
												<div className="flex items-center gap-2 min-w-0">
													{has ? (
														<Check className="h-4 w-4 shrink-0" />
													) : (
														<UserPlus className="h-4 w-4 text-gray-400 group-hover:text-primary shrink-0 transition-colors" />
													)}
													<span className="truncate font-medium">{role.name}</span>
												</div>
												{isPending ? (
													<Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
												) : (
													<span className={`text-[11px] font-medium shrink-0 ${has ? "text-primary group-hover:text-red-700" : "text-gray-400 group-hover:text-primary"}`}>
														{has ? "إزالة" : "إضافة"}
													</span>
												)}
											</button>
										)
									})}
								</div>
							)}
						</>
					)}
				</div>
			</div>

			<Modal open={!!editing} onClose={() => setEditing(null)} title="تعديل المستخدم" size="md">
				<form onSubmit={handleEdit}>
					<div className="p-6 space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
							<input required minLength={3} value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
								className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-soft focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
						</div>
						<label className="flex items-center gap-2 cursor-pointer">
							<input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} className="h-4 w-4 text-primary rounded cursor-pointer" />
							<span className="text-sm text-gray-900">حساب نشط (يستطيع تسجيل الدخول)</span>
						</label>
					</div>
					<div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-200 bg-gray-50">
						<button type="button" onClick={() => setEditing(null)} className="cursor-pointer px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">إلغاء</button>
						<button type="submit" disabled={isSaving} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50">
							{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}حفظ
						</button>
					</div>
				</form>
			</Modal>

			<Modal
				open={!!resettingUser}
				onClose={() => { setResettingUser(null); setNewPassword("") }}
				title={resettingUser ? `تعيين كلمة مرور جديدة لـ ${resettingUser.username}` : ""}
				description="سيُسجَّل خروج المستخدم من جميع جلساته الحالية. سلّم كلمة المرور الجديدة يداً بيد."
				size="md"
			>
				<form onSubmit={handleResetPassword}>
					<div className="p-6">
						<label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الجديدة</label>
						<input
							type="password"
							required
							minLength={6}
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-soft focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
						/>
						<p className="mt-1 text-xs text-gray-500">٦ أحرف على الأقل.</p>
					</div>
					<div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-200 bg-gray-50">
						<button type="button" onClick={() => { setResettingUser(null); setNewPassword("") }} className="cursor-pointer px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-white">إلغاء</button>
						<button type="submit" disabled={resetPasswordMutation.isPending} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50">
							{resetPasswordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
							تعيين
						</button>
					</div>
				</form>
			</Modal>

			{dialog}
		</div>
	)
}
