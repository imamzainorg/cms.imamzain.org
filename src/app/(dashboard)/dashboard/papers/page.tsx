"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { papersService } from "@/services/papers.service"
import type { AcademicPaper } from "@/types"
import { Plus, Edit, Trash2, Loader2, GraduationCap, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

export default function PapersPage() {
	const router = useRouter()
	const [papers, setPapers] = useState<AcademicPaper[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [page, setPage] = useState(1)
	const [total, setTotal] = useState(0)

	useEffect(() => { loadPapers() }, [page])

	const loadPapers = async () => {
		setIsLoading(true)
		try {
			const { data } = await papersService.list({ page, limit: 20 })
			setPapers(data.papers)
			setTotal(data.total)
		} catch { toast.error("Failed to load papers") }
		finally { setIsLoading(false) }
	}

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this paper?")) return
		try { await papersService.remove(id); toast.success("Paper deleted"); loadPapers() }
		catch { toast.error("Failed to delete paper") }
	}

	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

	return (
		<div>
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-3xl font-bold text-gray-900">Academic Papers</h1>
				<button onClick={() => router.push("/dashboard/papers/new")} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
					<Plus className="h-4 w-4" />New Paper
				</button>
			</div>
			<div className="bg-white shadow-sm rounded-lg overflow-hidden">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Authors</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PDF</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{papers.length === 0 ? (
							<tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500"><GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-300" /><p>No papers found</p></td></tr>
						) : papers.map((paper) => {
							const defaultT = paper.translations.find((t) => t.is_default) || paper.translations[0]
							return (
								<tr key={paper.id} className="hover:bg-gray-50">
									<td className="px-6 py-4 text-sm font-medium text-gray-900">{defaultT?.title || "Untitled"}</td>
									<td className="px-6 py-4 text-sm text-gray-500">{defaultT?.authors?.slice(0, 2).join(", ") || "—"}</td>
									<td className="px-6 py-4 text-sm text-gray-500">{paper.published_year || "—"}</td>
									<td className="px-6 py-4 text-sm text-gray-500">
										{paper.pdf_url ? <a href={paper.pdf_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" />PDF</a> : "—"}
									</td>
									<td className="px-6 py-4 text-sm text-gray-500">{format(new Date(paper.created_at), "MMM d, yyyy")}</td>
									<td className="px-6 py-4 text-right text-sm font-medium">
										<button onClick={() => router.push(`/dashboard/papers/${paper.id}`)} className="text-primary hover:text-primary/80 mr-3"><Edit className="h-4 w-4" /></button>
										<button onClick={() => handleDelete(paper.id)} className="text-red-600 hover:text-red-900"><Trash2 className="h-4 w-4" /></button>
									</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>
			{total > 20 && (
				<div className="mt-4 flex justify-between items-center">
					<p className="text-sm text-gray-500">Showing {papers.length} of {total}</p>
					<div className="flex gap-2">
						<button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50">Previous</button>
						<button onClick={() => setPage(page + 1)} disabled={papers.length < 20} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50">Next</button>
					</div>
				</div>
			)}
		</div>
	)
}