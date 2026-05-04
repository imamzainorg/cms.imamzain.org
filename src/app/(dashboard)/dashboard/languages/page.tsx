"use client"

import { useEffect, useState } from "react"
import { languagesService } from "@/services/languages.service"
import type { Language } from "@/types"
import { toast } from "sonner"
import { Loader2, Globe, Trash2 } from "lucide-react"

export default function LanguagesPage() {
	const [languages, setLanguages] = useState<Language[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [newCode, setNewCode] = useState("")
	const [isSaving, setIsSaving] = useState(false)

	useEffect(() => { loadLanguages() }, [])

	const loadLanguages = async () => {
		setIsLoading(true)
		try {
			const { data } = await languagesService.listAll()
			setLanguages(data)
		} catch { toast.error("Failed to load languages") }
		finally { setIsLoading(false) }
	}

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSaving(true)
		try {
			await languagesService.create(newCode.trim().toLowerCase())
			toast.success("Language added")
			setNewCode("")
			loadLanguages()
		} catch { toast.error("Failed to add language") }
		finally { setIsSaving(false) }
	}

	const toggleActive = async (code: string, current: boolean) => {
		try {
			await languagesService.update(code, { is_active: !current })
			toast.success("Language updated")
			loadLanguages()
		} catch { toast.error("Failed to update language") }
	}

	const handleDelete = async (code: string) => {
		if (!confirm(`Delete language "${code}"?`)) return
		try { await languagesService.remove(code); toast.success("Deleted"); loadLanguages() }
		catch { toast.error("Failed to delete language") }
	}

	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

	return (
		<div>
			<h1 className="text-3xl font-bold text-gray-900 mb-6">Languages</h1>

			<div className="bg-white shadow-sm rounded-lg p-6 mb-6">
				<h2 className="text-lg font-medium text-gray-900 mb-4">Add Language</h2>
				<form onSubmit={handleCreate} className="flex gap-4">
					<div className="flex-1">
						<input required value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="ISO 639-1 code (e.g. ar, en, fr)" maxLength={2}
							className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
					</div>
					<button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50">
						{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}Add
					</button>
				</form>
			</div>

			<div className="bg-white shadow-sm rounded-lg overflow-hidden">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RTL</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{languages.map((lang) => (
							<tr key={lang.code} className="hover:bg-gray-50">
								<td className="px-6 py-4"><div className="flex items-center gap-2"><Globe className="h-4 w-4 text-gray-400" /><span className="font-mono font-medium text-gray-900">{lang.code}</span></div></td>
								<td className="px-6 py-4 text-sm text-gray-700">{lang.name}</td>
								<td className="px-6 py-4 text-sm text-gray-500">{lang.is_rtl ? "Yes" : "No"}</td>
								<td className="px-6 py-4">
									<button onClick={() => toggleActive(lang.code, lang.is_active)}
										className={`px-2 py-0.5 text-xs font-semibold rounded-full ${lang.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
										{lang.is_active ? "Active" : "Inactive"}
									</button>
								</td>
								<td className="px-6 py-4 text-right">
									<button onClick={() => handleDelete(lang.code)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}