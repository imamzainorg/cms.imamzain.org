"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { postsService } from "@/services/posts.service"
import type { Post } from "@/types"
import { Plus, Edit, Trash2, Eye, Loader2, FileText } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

export default function PostsPage() {
	const router = useRouter()
	const [posts, setPosts] = useState<Post[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [page, setPage] = useState(1)
	const [total, setTotal] = useState(0)

	useEffect(() => { loadPosts() }, [page])

	const loadPosts = async () => {
		setIsLoading(true)
		try {
			const { data } = await postsService.list({ page, limit: 20 })
			setPosts(data.items)
			setTotal(data.pagination.total)
		} catch {
			toast.error("فشل تحميل المقالات")
		} finally {
			setIsLoading(false)
		}
	}

	const handleDelete = async (id: string) => {
		if (!confirm("هل تريد حذف هذه المقالة؟")) return
		try {
			await postsService.remove(id)
			toast.success("تم حذف المقالة")
			loadPosts()
		} catch {
			toast.error("فشل حذف المقالة")
		}
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		)
	}

	return (
		<div>
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-3xl font-bold text-gray-900">المقالات</h1>
				<button
					onClick={() => router.push("/dashboard/posts/new")}
					className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
				>
					<Plus className="h-4 w-4" />
					مقالة جديدة
				</button>
			</div>

			<div className="bg-white shadow-sm rounded-lg overflow-hidden">
				<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العنوان</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المشاهدات</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الإنشاء</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{posts.length === 0 ? (
							<tr>
								<td colSpan={5} className="px-6 py-12 text-center text-gray-500">
									<FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
									<p>لا توجد مقالات</p>
								</td>
							</tr>
						) : (
							posts.map((post) => (
								<tr key={post.id} className="hover:bg-gray-50">
									<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
										{post.post_translations.find((t) => t.is_default)?.title || post.post_translations[0]?.title || "بدون عنوان"}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${post.is_published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
											{post.is_published ? "منشور" : "مسودة"}
										</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										<div className="flex items-center gap-1">
											<Eye className="h-4 w-4" />
											{post.views}
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{post.created_at ? format(new Date(post.created_at), "dd/MM/yyyy") : "—"}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
										<button onClick={() => router.push(`/dashboard/posts/${post.id}`)} className="text-primary hover:text-primary/80 ml-3">
											<Edit className="h-4 w-4" />
										</button>
										<button onClick={() => handleDelete(post.id)} className="text-red-600 hover:text-red-900">
											<Trash2 className="h-4 w-4" />
										</button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
				</div>
			</div>

			{total > 20 && (
				<div className="mt-4 flex justify-between items-center">
					<p className="text-sm text-gray-500">عرض {posts.length} من {total}</p>
					<div className="flex gap-2">
						<button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50">السابق</button>
						<button onClick={() => setPage(page + 1)} disabled={posts.length < 20} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50">التالي</button>
					</div>
				</div>
			)}
		</div>
	)
}
