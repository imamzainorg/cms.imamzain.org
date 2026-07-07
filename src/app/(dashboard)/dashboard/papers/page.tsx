"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { AcademicPaper } from "@/types"
import { categoryName, pickTranslation } from "@/lib/i18n"
import { Plus, Edit, Trash2, GraduationCap, ExternalLink, Search, Calendar, Tag, FileText } from "lucide-react"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { safeFormat } from "@/lib/dates"
import EmptyState from "@/components/ui/EmptyState"
import Pagination from "@/components/ui/Pagination"
import CategoryFilterSelect from "@/components/ui/CategoryFilterSelect"
import PageHeader from "@/components/layout/PageHeader"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { ListSkeleton } from "@/components/ui/Skeleton"
import { usePapersList, useDeletePaper } from "@/lib/queries/papers"
import { usePaperCategoriesList } from "@/lib/queries/paper-categories"
import { useListPage } from "@/lib/use-list-page"

export default function PapersPage() {
	const router = useRouter()
	const { confirm, dialog } = useConfirm()
	const { page, setPage, limit, setLimit, search, setSearch, debouncedSearch, resetPageAndSelection } =
		useListPage({ initialLimit: 20 })
	const [categoryFilter, setCategoryFilter] = useState("")

	const onCategoryChange = (id: string) => {
		setCategoryFilter(id)
		resetPageAndSelection()
	}

	const categoriesQuery = usePaperCategoriesList({ limit: 100 })
	const categories = categoriesQuery.data?.items ?? []

	const papersQuery = usePapersList({
		page, limit,
		search: debouncedSearch || undefined,
		category_id: categoryFilter || undefined,
	})
	const papers = papersQuery.data?.items ?? []
	const total = papersQuery.data?.pagination.total ?? 0
	const pages = papersQuery.data?.pagination.pages ?? 1
	const loading = papersQuery.isLoading

	const deletePaper = useDeletePaper()

	const handleDelete = async (id: string) => {
		const ok = await confirm({
			title: "حذف هذا البحث؟",
			description: "سيُنقل البحث إلى سلة المهملات. يمكنك استعادته من صفحة المهملات.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		deletePaper.mutate(id, {
			onSuccess: () => toast.success("تم الحذف"),
			onError: (e) => toast.error(getErrorMessage(e, "فشل الحذف")),
		})
	}

	const titleOf = (p: AcademicPaper) =>
		pickTranslation(p.academic_paper_translations, p.translation)?.title || "بدون عنوان"

	const authorsOf = (p: AcademicPaper) =>
		pickTranslation(p.academic_paper_translations, p.translation)?.authors || []

	const keywordsOf = (p: AcademicPaper) =>
		pickTranslation(p.academic_paper_translations, p.translation)?.keywords || []

	const hasFilters = !!debouncedSearch || !!categoryFilter

	return (
		<div className="space-y-6">
			<PageHeader
				title="الأبحاث العلمية"
				description="ارفع الأبحاث مع المؤلفين، الكلمات المفتاحية، وملف PDF."
				icon={GraduationCap}
				actions={
					<div className="flex gap-2">
						<button onClick={() => router.push("/dashboard/papers/trash")} className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
							<Trash2 className="h-4 w-4" />سلة المهملات
						</button>
						<button onClick={() => router.push("/dashboard/papers/new")} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 shadow-sm transition-colors">
							<Plus className="h-4 w-4" />بحث جديد
						</button>
					</div>
				}
			/>

			<div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
				<div className="relative flex-1 min-w-50">
					<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
					<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالعنوان أو الكلمات المفتاحية..." className="w-full pr-9 pl-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
				</div>
				<CategoryFilterSelect
					categories={categories}
					value={categoryFilter}
					onChange={onCategoryChange}
					getName={(c) => categoryName(c.academic_paper_category_translations, c.translation)}
				/>
			</div>

			{loading ? (
				<div className="bg-white rounded-xl border border-gray-200">
					<ListSkeleton rows={5} />
				</div>
			) : papers.length === 0 ? (
				<EmptyState
					variant="card"
					icon={GraduationCap}
					title={hasFilters ? "لا توجد نتائج" : "لا توجد أبحاث بعد"}
					description={hasFilters ? "جرّب تغيير البحث أو التصنيف." : "أضف أول بحث علمي مع ملف PDF لعرضه على الموقع."}
					action={(
						<button onClick={() => router.push("/dashboard/papers/new")} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90">
							<Plus className="h-4 w-4" />{hasFilters ? "أضف بحثاً جديداً" : "أضف أول بحث"}
						</button>
					)}
				/>
			) : (
				<div className="space-y-3">
					{papers.map((p) => {
						const authors = authorsOf(p)
						const keywords = keywordsOf(p)
						const cat = p.academic_paper_categories
							? categoryName(p.academic_paper_categories.academic_paper_category_translations, p.academic_paper_categories.translation)
							: ""
						return (
							<div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer" onClick={() => router.push(`/dashboard/papers/${p.id}`)}>
								<div className="flex items-start gap-4">
									<div className="hidden sm:flex w-14 h-14 rounded-lg bg-secondary/15 text-secondary items-center justify-center shrink-0">
										<GraduationCap className="h-7 w-7" />
									</div>
									<div className="flex-1 min-w-0">
										<h3 className="text-lg font-semibold text-gray-900 hover:text-primary mb-1 line-clamp-2">{titleOf(p)}</h3>
										{authors.length > 0 && (
											<p className="text-sm text-gray-600 mb-2">{authors.join("، ")}</p>
										)}
										<div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-2">
											{p.published_year && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{p.published_year}</span>}
											<span className="flex items-center gap-1"><Tag className="h-3 w-3" />{cat || "بدون تصنيف"}</span>
											{p.pdf_url && (
												<a href={p.pdf_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="cursor-pointer text-primary hover:underline flex items-center gap-1">
													<FileText className="h-3 w-3" />ملف PDF<ExternalLink className="h-2.5 w-2.5" />
												</a>
											)}
										</div>
										{keywords.length > 0 && (
											<div className="flex flex-wrap gap-1">
												{keywords.slice(0, 6).map((k, i) => (
													<span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] rounded-full">{k}</span>
												))}
												{keywords.length > 6 && <span className="text-[11px] text-gray-400">+{keywords.length - 6}</span>}
											</div>
										)}
									</div>
									<div className="flex flex-col items-end gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
										<span className="text-[11px] text-gray-400">{safeFormat(p.created_at, "dd/MM/yyyy", "")}</span>
										<div className="flex gap-1">
											<button onClick={() => router.push(`/dashboard/papers/${p.id}`)} className="cursor-pointer p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded" title="تعديل"><Edit className="h-4 w-4" /></button>
											<button onClick={() => handleDelete(p.id)} className="cursor-pointer p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="حذف"><Trash2 className="h-4 w-4" /></button>
										</div>
									</div>
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
				onPage={setPage}
				onLimit={setLimit}
			/>
			{dialog}
		</div>
	)
}
