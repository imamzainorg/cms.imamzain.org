"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { Book } from "@/types"
import { categoryName, pickTranslation } from "@/lib/i18n"
import { Plus, Edit2, Trash2, Eye, BookOpen, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import EmptyState from "@/components/ui/EmptyState"
import IconButton from "@/components/ui/IconButton"
import PageHeader from "@/components/layout/PageHeader"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { CardGridSkeleton } from "@/components/ui/Skeleton"
import { useBooksList, useDeleteBook } from "@/lib/queries/books"
import { useBookCategoriesList } from "@/lib/queries/book-categories"

export default function BooksPage() {
	const router = useRouter()
	const { confirm, dialog } = useConfirm()
	const [page, setPage] = useState(1)
	const [limit, setLimit] = useState(24)
	const [search, setSearch] = useState("")
	const [debouncedSearch, setDebouncedSearch] = useState("")
	const [categoryFilter, setCategoryFilter] = useState("")

	useEffect(() => {
		const t = setTimeout(() => {
			setDebouncedSearch(search.trim())
			setPage(1)
		}, 300)
		return () => clearTimeout(t)
	}, [search])

	const onCategoryChange = (id: string) => { setCategoryFilter(id); setPage(1) }
	const onLimitChange = (n: number) => { setLimit(n); setPage(1) }

	const categoriesQuery = useBookCategoriesList({ limit: 100 })
	const categories = categoriesQuery.data?.items ?? []

	const booksQuery = useBooksList({
		page, limit,
		search: debouncedSearch || undefined,
		category_id: categoryFilter || undefined,
	})
	const books = booksQuery.data?.items ?? []
	const total = booksQuery.data?.pagination.total ?? 0
	const pages = booksQuery.data?.pagination.pages ?? 1
	const loading = booksQuery.isLoading

	const deleteBook = useDeleteBook()

	const handleDelete = async (b: Book) => {
		const ok = await confirm({
			title: "حذف هذا الكتاب؟",
			description: "سيُحذف الكتاب نهائياً مع كل ترجماته. لا يمكن التراجع.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		deleteBook.mutate(b.id, {
			onSuccess: () => toast.success("تم الحذف"),
			onError: (e) => toast.error(getErrorMessage(e, "فشل الحذف")),
		})
	}

	const titleOf = (b: Book) =>
		pickTranslation(b.book_translations, b.translation)?.title || "بدون عنوان"

	const authorOf = (b: Book) =>
		pickTranslation(b.book_translations, b.translation)?.author || ""

	const fromIdx = total === 0 ? 0 : (page - 1) * limit + 1
	const toIdx = Math.min(page * limit, total)

	const hasFilters = !!debouncedSearch || !!categoryFilter

	return (
		<div className="space-y-6">
			<PageHeader
				title="المكتبة"
				description="أضف كتباً مع غلاف، مؤلف، وملف PDF. يمكن نشرها بعدة لغات."
				icon={BookOpen}
				actions={
					<div className="flex gap-2">
						<button onClick={() => router.push("/dashboard/books/trash")} className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
							<Trash2 className="h-4 w-4" />سلة المهملات
						</button>
						<button onClick={() => router.push("/dashboard/books/new")} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 shadow-sm transition-colors">
							<Plus className="h-4 w-4" />كتاب جديد
						</button>
					</div>
				}
			/>

			<div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
				<div className="relative flex-1 min-w-50">
					<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
					<input
						value={search} onChange={(e) => setSearch(e.target.value)}
						placeholder="ابحث في العنوان أو المؤلف..."
						className="w-full pr-9 pl-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
					/>
				</div>
				<select value={categoryFilter} onChange={(e) => onCategoryChange(e.target.value)} className="cursor-pointer px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary">
					<option value="">كل التصنيفات</option>
					{categories.map((c) => (
						<option key={c.id} value={c.id}>{categoryName(c.book_category_translations, c.translation)}</option>
					))}
				</select>
			</div>

			{loading ? (
				<CardGridSkeleton count={12} aspect="aspect-[3/4]" />
			) : books.length === 0 ? (
				<EmptyState
					variant="card"
					icon={BookOpen}
					title={hasFilters ? "لا توجد نتائج" : "المكتبة فارغة"}
					description={hasFilters ? "جرّب تغيير البحث أو التصنيف." : "أضف أول كتاب مع غلافه ومؤلفه. الكتب تظهر في المكتبة على الموقع."}
					action={(
						<button onClick={() => router.push("/dashboard/books/new")} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90">
							<Plus className="h-4 w-4" />{hasFilters ? "أضف كتاباً جديداً" : "أضف أول كتاب"}
						</button>
					)}
				/>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
					{books.map((book) => {
						const thumb = book.media?.url || null
						return (
							<div key={book.id} className="group cursor-pointer">
								<button onClick={() => router.push(`/dashboard/books/${book.id}`)} className="cursor-pointer block w-full text-right">
									<div className="aspect-2/3 bg-linear-to-br from-secondary/20 to-primary/10 rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-all relative">
										{thumb ? (
											<img src={thumb} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
										) : (
											<div className="w-full h-full flex items-center justify-center">
												<BookOpen className="h-12 w-12 text-gray-300" />
											</div>
										)}
										<div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-[10px] bg-black/40 backdrop-blur px-1.5 py-0.5 rounded-full">
											<Eye className="h-2.5 w-2.5" />{book.views ?? 0}
										</div>
									</div>
									<div className="mt-2 px-1">
										<h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight group-hover:text-primary">{titleOf(book)}</h3>
										{authorOf(book) && <p className="text-xs text-gray-500 truncate mt-0.5">{authorOf(book)}</p>}
									</div>
								</button>
								<div className="mt-1.5 px-1 flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
									<IconButton
										onClick={() => router.push(`/dashboard/books/${book.id}`)}
										label="تعديل"
										icon={<Edit2 className="h-4 w-4" strokeWidth={1.6} />}
									/>
									<IconButton
										onClick={() => handleDelete(book)}
										label="حذف"
										tone="danger"
										icon={<Trash2 className="h-4 w-4" strokeWidth={1.6} />}
									/>
								</div>
							</div>
						)
					})}
				</div>
			)}

			{total > 0 && (
				<div className="mt-6 flex justify-between items-center text-sm text-gray-600 flex-wrap gap-3">
					<div className="flex items-center gap-3">
						<span>عرض <span className="font-semibold text-gray-900">{fromIdx}–{toIdx}</span> من <span className="font-semibold text-gray-900">{total}</span></span>
						<select value={limit} onChange={(e) => onLimitChange(Number(e.target.value))} className="cursor-pointer text-xs border border-gray-300 rounded-md px-2 py-1 focus:ring-primary focus:border-primary">
							<option value={24}>24 / صفحة</option>
							<option value={48}>48 / صفحة</option>
							<option value={96}>96 / صفحة</option>
						</select>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-xs text-gray-500">صفحة {page} من {pages}</span>
						<button onClick={() => setPage(page - 1)} disabled={page === 1} className="cursor-pointer inline-flex items-center gap-1 px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50"><ChevronRight className="h-4 w-4" />السابق</button>
						<button onClick={() => setPage(page + 1)} disabled={page >= pages} className="cursor-pointer inline-flex items-center gap-1 px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50">التالي<ChevronLeft className="h-4 w-4" /></button>
					</div>
				</div>
			)}
			{dialog}
		</div>
	)
}
