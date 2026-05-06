"use client"

import { useEffect, useState } from "react"
import { rolesService } from "@/services/roles.service"
import type { Role, Permission } from "@/types"
import { toast } from "sonner"
import { Plus, Trash2, Loader2, Shield, X, ChevronDown, ChevronRight } from "lucide-react"

export default function RolesPage() {
	const [roles, setRoles] = useState<Role[]>([])
	const [permissions, setPermissions] = useState<Permission[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [expanded, setExpanded] = useState<string | null>(null)
	const [showCreate, setShowCreate] = useState(false)
	const [newRoleName, setNewRoleName] = useState("")
	const [newRoleTitle, setNewRoleTitle] = useState("")
	const [isSaving, setIsSaving] = useState(false)

	useEffect(() => { loadAll() }, [])

	const loadAll = async () => {
		setIsLoading(true)
		try {
			const [r, p] = await Promise.all([rolesService.list(), rolesService.listPermissions()])
			setRoles(r.data.items ?? [])
			setPermissions(p.data.items ?? [])
		} catch { toast.error("فشل تحميل الأدوار والصلاحيات") }
		finally { setIsLoading(false) }
	}

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSaving(true)
		try {
			await rolesService.create({ name: newRoleName, translations: [{ lang: "ar", title: newRoleTitle }] })
			toast.success("تم إنشاء الدور")
			setNewRoleName(""); setNewRoleTitle(""); setShowCreate(false)
			loadAll()
		} catch { toast.error("فشل إنشاء الدور") }
		finally { setIsSaving(false) }
	}

	const handleDelete = async (id: string) => {
		if (!confirm("هل تريد حذف هذا الدور؟ سيفشل الحذف إذا كان مُعيَّناً لمستخدم.")) return
		try { await rolesService.remove(id); toast.success("تم حذف الدور"); loadAll() }
		catch { toast.error("لا يمكن الحذف — الدور مُعيَّن لمستخدمين") }
	}

	const togglePermission = async (roleId: string, permId: string, has: boolean) => {
		try {
			if (has) { await rolesService.removePermission(roleId, permId); toast.success("تمت إزالة الصلاحية") }
			else { await rolesService.assignPermission(roleId, permId); toast.success("تم تعيين الصلاحية") }
			loadAll()
		} catch { toast.error("فشل تحديث الصلاحية") }
	}

	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

	return (
		<div>
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-3xl font-bold text-gray-900">الأدوار والصلاحيات</h1>
				<button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
					<Plus className="h-4 w-4" />دور جديد
				</button>
			</div>

			{showCreate && (
				<div className="bg-white shadow-sm rounded-lg p-6 mb-6">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-lg font-medium text-gray-900">إنشاء دور</h2>
						<button onClick={() => setShowCreate(false)}><X className="h-5 w-5 text-gray-400" /></button>
					</div>
					<form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700">اسم الدور (slug)</label>
							<input required value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="مثال: editor" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">العنوان</label>
							<input required value={newRoleTitle} onChange={(e) => setNewRoleTitle(e.target.value)} placeholder="مثال: محرر" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
						</div>
						<div className="flex items-end">
							<button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50">
								{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}إنشاء
							</button>
						</div>
					</form>
				</div>
			)}

			<div className="space-y-4">
				{roles.length === 0 ? (
					<div className="bg-white shadow-sm rounded-lg p-12 text-center text-gray-500">
						<Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
						<p>لا توجد أدوار</p>
					</div>
				) : roles.map((role) => (
					<div key={role.id} className="bg-white shadow-sm rounded-lg overflow-hidden">
						<div className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(expanded === role.id ? null : role.id)}>
							<div className="flex items-center gap-3">
								{expanded === role.id ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
								<Shield className="h-5 w-5 text-primary" />
								<div>
									<p className="font-medium text-gray-900">{role.name}</p>
									<p className="text-sm text-gray-500">
										{(role.role_translations ?? []).find((t) => t.lang === "ar")?.title ||
											(role.role_translations ?? []).find((t) => t.lang === "en")?.title ||
											(role.role_translations ?? [])[0]?.title}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<span className="text-sm text-gray-500">{(role.permissions ?? []).length} صلاحية</span>
								<button onClick={(e) => { e.stopPropagation(); handleDelete(role.id) }} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
							</div>
						</div>
						{expanded === role.id && (
							<div className="px-6 pb-6 border-t border-gray-100">
								<p className="text-sm font-medium text-gray-700 mt-4 mb-3">الصلاحيات</p>
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
									{permissions.map((perm) => {
										const has = (role.permissions ?? []).some((p) => p.id === perm.id)
										return (
											<label key={perm.id} className="flex items-center gap-2 cursor-pointer">
												<input type="checkbox" checked={has} onChange={() => togglePermission(role.id, perm.id, has)} className="h-4 w-4 text-primary rounded" />
												<span className="text-sm text-gray-700">{perm.name}</span>
											</label>
										)
									})}
								</div>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	)
}
