"use client"

import { editHref } from "@/lib/routes"
import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Book } from "@/types"
import { categoryName, pickTranslation } from "@/lib/i18n"
import { Plus, Edit2, Trash2, Eye, EyeOff, BookOpen, Search, FileText, Layers } from "lucide-react"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import Badge from "@/components/ui/Badge"
import EmptyState from "@/components/ui/EmptyState"
import IconButton from "@/components/ui/IconButton"
import Pagination from "@/components/ui/Pagination"
import CategoryFilterSelect from "@/components/ui/CategoryFilterSelect"
import PageHeader from "@/components/layout/PageHeader"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { CardGridSkeleton } from "@/components/ui/Skeleton"
import { useBooksList, useDeleteBook, useTogglePublishBook } from "@/lib/queries/books"
import { useBookCategoriesList } from "@/lib/queries/book-categories"
import { useListPage } from "@/lib/use-list-page"

export default function BooksPage() {
	const router = useRouter()
	const { confirm, dialog } = useConfirm()
	const { page, setPage, limit, setLimit, search, setSearch, debouncedSearch, resetPageAndSelection } =
		useListPage({ initialLimit: 24 })
	const [categoryFilter, setCategoryFilter] = useState("")
	// «الإصدارات»: the institution's own releases, independent of topic category.
	const [publicationsOnly, setPublicationsOnly] = useState(false)

	const onCategoryChange = (id: string) => {
		setCategoryFilter(id)
		resetPageAndSelection()
	}
	const onPublicationsToggle = () => {
		setPublicationsOnly((v) => !v)
		resetPageAndSelection()
	}

	const categoriesQuery = useBookCategoriesList({ limit: 100 })
	const categories = categoriesQuery.data?.items ?? []

	// /books/admin has no published/draft filter (BookQueryDto declares none) —
	// it always returns drafts + published together. Reviewing drafts happens
	// via the per-card badge and publish toggle below, not a list-level filter.
	// A multi-part series is ONE card here (its volumes live inside it).
	const booksQuery = useBooksList({
		page, limit,
		search: debouncedSearch || undefined,
		category_id: categoryFilter || undefined,
		// Exact true/false only: omit (not false) for "no filter".
		is_publication: publicationsOnly ? true : undefined,
	})
	const books = booksQuery.data?.items ?? []
	const total = booksQuery.data?.pagination.total ?? 0
	const pages = booksQuery.data?.pagination.pages ?? 1
	const loading = booksQuery.isLoading

	const deleteBook = useDeleteBook()
	const togglePublish = useTogglePublishBook()

	const handleDelete = async (b: Book) => {
		const ok = await confirm({
			title: "حذف هذا الكتاب؟",
			description: b.is_published
				? "الكتاب منشور حالياً وسيختفي من الموقع فوراً. سيُنقل إلى سلة المهملات ويمكن استعادته."
				: "سيُنقل الكتاب إلى سلة المهملات. يمكنك استعادته من صفحة المهملات.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		deleteBook.mutate(b.id, {
			onSuccess: () => toast.success("تم الحذف"),
			onError: (e) => toast.error(getErrorMessage(e, "فشل الحذف")),
		})
	}

	const handleTogglePublish = (b: Book) => {
		togglePublish.mutate(
			{ id: b.id, is_published: !b.is_published },
			{
				onSuccess: () => toast.success(b.is_published ? "تم سحب النشر" : "تم النشر"),
				onError: (e) => toast.error(getErrorMessage(e, "تعذّر التحديث")),
			},
		)
	}

	const titleOf = (b: Book) =>
		pickTranslation(b.book_translations, b.translation)?.title || "بدون عنوان"

	const authorOf = (b: Book) =>
		pickTranslation(b.book_translations, b.translation)?.author || ""

	const hasFilters = !!debouncedSearch || !!categoryFilter || publicationsOnly

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
				<CategoryFilterSelect
					categories={categories}
					value={categoryFilter}
					onChange={onCategoryChange}
					getName={(c) => categoryName(c.book_category_translations, c.translation)}
				/>
				<label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
					<input type="checkbox" checked={publicationsOnly} onChange={onPublicationsToggle} className="h-4 w-4 text-primary rounded cursor-pointer" />
					إصدارات المؤسسة فقط
				</label>
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
								<button onClick={() => router.push(editHref.book(book.id))} className="cursor-pointer block w-full text-right">
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
										{book.pdf_url && (
											<div className="absolute bottom-1 right-1 flex items-center gap-1 text-white text-[10px] bg-primary/80 backdrop-blur px-1.5 py-0.5 rounded-full" title="ملف PDF متوفر">
												<FileText className="h-2.5 w-2.5" />PDF
											</div>
										)}
										{!book.is_published && (
											<div className="absolute top-1 right-1">
												<Badge variant="default" dot>مسودة</Badge>
											</div>
										)}
										{(book.parts_count ?? 0) > 0 && (
											<div className="absolute top-1 left-1 flex items-center gap-1 text-white text-[10px] bg-secondary/90 px-1.5 py-0.5 rounded-full" title="سلسلة من عدة أجزاء — تُدار أجزاؤها من صفحة تعديل السلسلة">
												<Layers className="h-2.5 w-2.5" />{book.parts_count} أجزاء
											</div>
										)}
									</div>
									<div className="mt-2 px-1">
										<h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight group-hover:text-primary">{titleOf(book)}</h3>
										{authorOf(book) && <p className="text-xs text-gray-500 truncate mt-0.5">{authorOf(book)}</p>}
										<p className="mt-1 text-[11px] text-gray-400" dir="ltr">
											{book.document_languages?.length ? book.document_languages.join(" · ").toUpperCase() : "—"}
										</p>
									</div>
								</button>
								<div className="mt-1.5 px-1 flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
									<IconButton
										onClick={() => handleTogglePublish(book)}
										disabled={togglePublish.isPending}
										label={book.is_published ? "سحب النشر" : "نشر"}
										icon={book.is_published
											? <EyeOff className="h-4 w-4" strokeWidth={1.6} />
											: <Eye className="h-4 w-4" strokeWidth={1.6} />}
									/>
									<IconButton
										onClick={() => router.push(editHref.book(book.id))}
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

			<Pagination
				page={page}
				pages={pages}
				total={total}
				limit={limit}
				pageSizes={[24, 48, 96]}
				onPage={setPage}
				onLimit={setLimit}
			/>
			{dialog}
		</div>
	)
}
