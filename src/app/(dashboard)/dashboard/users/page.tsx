"use client"

import { useEffect, useState } from "react"
import { usersService } from "@/services/users.service"
import { rolesService } from "@/services/roles.service"
import type { UserSummary, Role } from "@/types"
import { toast } from "sonner"
import { Plus, Trash2, Loader2, Users as UsersIcon, X, Shield } from "lucide-react"
import { format } from "date-fns"

export default function UsersPage() {
	const [users, setUsers] = useState<UserSummary[]>([])
	const [roles, setRoles] = useState<Role[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [showCreate, setShowCreate] = useState(false)
	const [selected, setSelected] = useState<UserSummary | null>(null)
	const [form, setForm] = useState({ username: "", password: "" })
	const [isSaving, setIsSaving] = useState(false)

	useEffect(() => { loadAll() }, [])

	const loadAll = async () => {
		setIsLoading(true)
		try {
			const [u, r] = await Promise.all([usersService.list(), rolesService.list()])
			setUsers(u.data.items ?? [])
			setRoles(r.data.items ?? [])
		} catch { toast.error("فشل تحميل المستخدمين") }
		finally { setIsLoading(false) }
	}

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSaving(true)
		try {
			await usersService.create(form)
			toast.success("تم إنشاء المستخدم")
			setForm({ username: "", password: "" })
			setShowCreate(false)
			loadAll()
		} catch { toast.error("فشل إنشاء المستخدم") }
		finally { setIsSaving(false) }
	}

	const handleDelete = async (id: string) => {
		if (!confirm("هل تريد حذف هذا المستخدم؟")) return
		try { await usersService.remove(id); toast.success("تم حذف المستخدم"); loadAll() }
		catch { toast.error("فشل حذف المستخدم") }
	}

	const assignRole = async (userId: string, roleId: string) => {
		try { await usersService.assignRole(userId, roleId); toast.success("تم تعيين الدور"); loadAll() }
		catch { toast.error("فشل تعيين الدور") }
	}

	const removeRole = async (userId: string, roleId: string) => {
		try { await usersService.removeRole(userId, roleId); toast.success("تم إزالة الدور"); loadAll() }
		catch { toast.error("فشل إزالة الدور") }
	}

	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

	return (
		<div>
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-3xl font-bold text-gray-900">المستخدمون</h1>
				<button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
					<Plus className="h-4 w-4" />مستخدم جديد
				</button>
			</div>

			{showCreate && (
				<div className="bg-white shadow-sm rounded-lg p-6 mb-6">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-lg font-medium text-gray-900">إنشاء مستخدم</h2>
						<button onClick={() => setShowCreate(false)}><X className="h-5 w-5 text-gray-400" /></button>
					</div>
					<form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700">اسم المستخدم</label>
							<input required minLength={3} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">كلمة المرور</label>
							<input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
						</div>
						<div className="flex items-end">
							<button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50">
								{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}إنشاء
							</button>
						</div>
					</form>
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 bg-white shadow-sm rounded-lg overflow-hidden">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">اسم المستخدم</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الأدوار</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الإنشاء</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{users.length === 0 ? (
								<tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500"><UsersIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" /><p>لا يوجد مستخدمون</p></td></tr>
							) : users.map((u) => (
								<tr key={u.id} onClick={() => setSelected(u)} className="cursor-pointer hover:bg-gray-50">
									<td className="px-6 py-4 text-sm font-medium text-gray-900">{u.username}</td>
									<td className="px-6 py-4 text-sm text-gray-500">
										<div className="flex flex-wrap gap-1">
											{(u.user_roles ?? []).map((ur) => (
												<span key={ur.roles.id} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{ur.roles.name}</span>
											))}
										</div>
									</td>
									<td className="px-6 py-4">
										<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
											{u.is_active ? "نشط" : "غير نشط"}
										</span>
									</td>
									<td className="px-6 py-4 text-sm text-gray-500">{u.created_at ? format(new Date(u.created_at), "dd/MM/yyyy") : "—"}</td>
									<td className="px-6 py-4 text-left text-sm font-medium">
										<button onClick={(e) => { e.stopPropagation(); handleDelete(u.id) }} className="text-red-600 hover:text-red-900"><Trash2 className="h-4 w-4" /></button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{selected && (
					<div className="bg-white shadow-sm rounded-lg p-6">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-medium text-gray-900">إدارة الأدوار</h3>
							<button onClick={() => setSelected(null)}><X className="h-4 w-4 text-gray-400" /></button>
						</div>
						<p className="text-sm font-medium text-gray-700 mb-3">{selected.username}</p>
						<div className="space-y-2">
							{roles.map((role) => {
								const has = (selected.user_roles ?? []).some((ur) => ur.roles.id === role.id)
								return (
									<div key={role.id} className="flex items-center justify-between py-2 border-b border-gray-100">
										<div className="flex items-center gap-2">
											<Shield className={`h-4 w-4 ${has ? "text-primary" : "text-gray-400"}`} />
											<span className="text-sm text-gray-900">{role.name}</span>
										</div>
										<button
											onClick={() => has ? removeRole(selected.id, role.id) : assignRole(selected.id, role.id)}
											className={`text-xs px-2 py-1 rounded-md ${has ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
											{has ? "إزالة" : "تعيين"}
										</button>
									</div>
								)
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
