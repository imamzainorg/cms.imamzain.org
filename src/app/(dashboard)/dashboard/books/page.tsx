"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { booksService } from "@/services/books.service"
import type { Book } from "@/types"
import { Plus, Edit, Trash2, Eye, Loader2, BookOpen } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

export default function BooksPage() {
	const router = useRouter()
	const [books, setBooks] = useState<Book[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [page, setPage] = useState(1)
	const [total, setTotal] = useState(0)

	useEffect(() => { loadBooks() }, [page])

	const loadBooks = async () => {
		setIsLoading(true)
		try {
			const { data } = await booksService.list({ page, limit: 20 })
			setBooks(data.books)
			setTotal(data.total)
		} catch { toast.error("Failed to load books") }
		finally { setIsLoading(false) }
	}

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this book?")) return
		try { await booksService.remove(id); toast.success("Book deleted"); loadBooks() }
		catch { toast.error("Failed to delete book") }
	}

	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

	return (
		<div>
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-3xl font-bold text-gray-900">Books</h1>
				<button onClick={() => router.push("/dashboard/books/new")} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
					<Plus className="h-4 w-4" />New Book
				</button>
			</div>
			<div className="bg-white shadow-sm rounded-lg overflow-hidden">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ISBN</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Views</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{books.length === 0 ? (
							<tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500"><BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" /><p>No books found</p></td></tr>
						) : books.map((book) => (
							<tr key={book.id} className="hover:bg-gray-50">
								<td className="px-6 py-4 text-sm font-medium text-gray-900">
									{book.translations.find((t) => t.is_default)?.title || book.translations[0]?.title || "Untitled"}
								</td>
								<td className="px-6 py-4 text-sm text-gray-500">
									{book.translations.find((t) => t.is_default)?.author || "—"}
								</td>
								<td className="px-6 py-4 text-sm text-gray-500">{book.isbn || "—"}</td>
								<td className="px-6 py-4 text-sm text-gray-500"><div className="flex items-center gap-1"><Eye className="h-4 w-4" />{book.views}</div></td>
								<td className="px-6 py-4 text-sm text-gray-500">{format(new Date(book.created_at), "MMM d, yyyy")}</td>
								<td className="px-6 py-4 text-right text-sm font-medium">
									<button onClick={() => router.push(`/dashboard/books/${book.id}`)} className="text-primary hover:text-primary/80 mr-3"><Edit className="h-4 w-4" /></button>
									<button onClick={() => handleDelete(book.id)} className="text-red-600 hover:text-red-900"><Trash2 className="h-4 w-4" /></button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{total > 20 && (
				<div className="mt-4 flex justify-between items-center">
					<p className="text-sm text-gray-500">Showing {books.length} of {total}</p>
					<div className="flex gap-2">
						<button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50">Previous</button>
						<button onClick={() => setPage(page + 1)} disabled={books.length < 20} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50">Next</button>
					</div>
				</div>
			)}
		</div>
	)
}