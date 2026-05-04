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
			setRoles(r.data.roles)
			setPermissions(p.data.permissions)
		} catch { toast.error("Failed to load roles") }
		finally { setIsLoading(false) }
	}

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSaving(true)
		try {
			await rolesService.create({ name: newRoleName, translations: [{ lang: "en", title: newRoleTitle }] })
			toast.success("Role created")
			setNewRoleName(""); setNewRoleTitle(""); setShowCreate(false)
			loadAll()
		} catch { toast.error("Failed to create role") }
		finally { setIsSaving(false) }
	}

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this role? This fails if assigned to any user.")) return
		try { await rolesService.remove(id); toast.success("Role deleted"); loadAll() }
		catch { toast.error("Cannot delete — role is assigned to users") }
	}

	const togglePermission = async (roleId: string, permId: string, has: boolean) => {
		try {
			if (has) { await rolesService.removePermission(roleId, permId); toast.success("Permission removed") }
			else { await rolesService.assignPermission(roleId, permId); toast.success("Permission assigned") }
			loadAll()
		} catch { toast.error("Failed to update permission") }
	}

	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

	return (
		<div>
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-3xl font-bold text-gray-900">Roles & Permissions</h1>
				<button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
					<Plus className="h-4 w-4" />New Role
				</button>
			</div>

			{showCreate && (
				<div className="bg-white shadow-sm rounded-lg p-6 mb-6">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-lg font-medium text-gray-900">Create Role</h2>
						<button onClick={() => setShowCreate(false)}><X className="h-5 w-5 text-gray-400" /></button>
					</div>
					<form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700">Role Name (slug)</label>
							<input required value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="e.g. editor" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">Display Title (EN)</label>
							<input required value={newRoleTitle} onChange={(e) => setNewRoleTitle(e.target.value)} placeholder="e.g. Editor" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
						</div>
						<div className="flex items-end">
							<button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50">
								{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}Create
							</button>
						</div>
					</form>
				</div>
			)}

			<div className="space-y-4">
				{roles.map((role) => (
					<div key={role.id} className="bg-white shadow-sm rounded-lg overflow-hidden">
						<div className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(expanded === role.id ? null : role.id)}>
							<div className="flex items-center gap-3">
								{expanded === role.id ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
								<Shield className="h-5 w-5 text-primary" />
								<div>
									<p className="font-medium text-gray-900">{role.name}</p>
									<p className="text-sm text-gray-500">{role.translations.find((t) => t.lang === "en")?.title}</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<span className="text-sm text-gray-500">{role.permissions?.length || 0} permissions</span>
								<button onClick={(e) => { e.stopPropagation(); handleDelete(role.id) }} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
							</div>
						</div>
						{expanded === role.id && (
							<div className="px-6 pb-6 border-t border-gray-100">
								<p className="text-sm font-medium text-gray-700 mt-4 mb-3">Permissions</p>
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
									{permissions.map((perm) => {
										const has = role.permissions?.some((p) => p.id === perm.id)
										return (
											<label key={perm.id} className="flex items-center gap-2 cursor-pointer">
												<input type="checkbox" checked={has} onChange={() => togglePermission(role.id, perm.id, !!has)} className="h-4 w-4 text-primary rounded" />
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