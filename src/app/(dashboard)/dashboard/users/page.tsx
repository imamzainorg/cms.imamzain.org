"use client"

import { useEffect, useState } from "react"
import { usersService } from "@/services/users.service"
import { rolesService } from "@/services/roles.service"
import type { AdminUser, Role } from "@/types"
import { toast } from "sonner"
import { Plus, Edit, Trash2, Loader2, Users as UsersIcon, X, Shield } from "lucide-react"
import { format } from "date-fns"

export default function UsersPage() {
	const [users, setUsers] = useState<AdminUser[]>([])
	const [roles, setRoles] = useState<Role[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [showCreate, setShowCreate] = useState(false)
	const [selected, setSelected] = useState<AdminUser | null>(null)
	const [form, setForm] = useState({ username: "", password: "" })
	const [isSaving, setIsSaving] = useState(false)

	useEffect(() => { loadAll() }, [])

	const loadAll = async () => {
		setIsLoading(true)
		try {
			const [u, r] = await Promise.all([usersService.list(), rolesService.list()])
			setUsers(u.data.users)
			setRoles(r.data.roles)
		} catch { toast.error("Failed to load users") }
		finally { setIsLoading(false) }
	}

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSaving(true)
		try {
			await usersService.create(form)
			toast.success("User created")
			setForm({ username: "", password: "" })
			setShowCreate(false)
			loadAll()
		} catch { toast.error("Failed to create user") }
		finally { setIsSaving(false) }
	}

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this user?")) return
		try { await usersService.remove(id); toast.success("User deleted"); loadAll() }
		catch { toast.error("Failed to delete user") }
	}

	const assignRole = async (userId: string, roleId: string) => {
		try { await usersService.assignRole(userId, roleId); toast.success("Role assigned"); loadAll() }
		catch { toast.error("Failed to assign role") }
	}

	const removeRole = async (userId: string, roleId: string) => {
		try { await usersService.removeRole(userId, roleId); toast.success("Role removed"); loadAll() }
		catch { toast.error("Failed to remove role") }
	}

	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

	return (
		<div>
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-3xl font-bold text-gray-900">Users</h1>
				<button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
					<Plus className="h-4 w-4" />New User
				</button>
			</div>

			{showCreate && (
				<div className="bg-white shadow-sm rounded-lg p-6 mb-6">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-lg font-medium text-gray-900">Create User</h2>
						<button onClick={() => setShowCreate(false)}><X className="h-5 w-5 text-gray-400" /></button>
					</div>
					<form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700">Username</label>
							<input required minLength={3} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">Password</label>
							<input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
						</div>
						<div className="flex items-end">
							<button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50">
								{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}Create
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
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roles</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{users.length === 0 ? (
								<tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500"><UsersIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" /><p>No users found</p></td></tr>
							) : users.map((u) => (
								<tr key={u.id} onClick={() => setSelected(u)} className="cursor-pointer hover:bg-gray-50">
									<td className="px-6 py-4 text-sm font-medium text-gray-900">{u.username}</td>
									<td className="px-6 py-4 text-sm text-gray-500">
										<div className="flex flex-wrap gap-1">
											{u.roles?.map((r) => (
												<span key={r.id} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{r.name}</span>
											))}
										</div>
									</td>
									<td className="px-6 py-4">
										<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
											{u.is_active ? "Active" : "Inactive"}
										</span>
									</td>
									<td className="px-6 py-4 text-sm text-gray-500">{format(new Date(u.created_at), "MMM d, yyyy")}</td>
									<td className="px-6 py-4 text-right text-sm font-medium">
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
							<h3 className="text-lg font-medium text-gray-900">Manage Roles</h3>
							<button onClick={() => setSelected(null)}><X className="h-4 w-4 text-gray-400" /></button>
						</div>
						<p className="text-sm font-medium text-gray-700 mb-3">{selected.username}</p>
						<div className="space-y-2">
							{roles.map((role) => {
								const has = selected.roles?.some((r) => r.id === role.id)
								return (
									<div key={role.id} className="flex items-center justify-between py-2 border-b border-gray-100">
										<div className="flex items-center gap-2">
											<Shield className="h-4 w-4 text-gray-400" />
											<span className="text-sm text-gray-900">{role.name}</span>
										</div>
										<button
											onClick={() => has ? removeRole(selected.id, role.id) : assignRole(selected.id, role.id)}
											className={`text-xs px-2 py-1 rounded-md ${has ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
											{has ? "Remove" : "Assign"}
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