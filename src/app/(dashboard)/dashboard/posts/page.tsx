"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import type { Post, PostStatus } from "@/types"
import { categoryName, pickTranslation } from "@/lib/i18n"
import { Plus, Edit, Trash2, Eye, FileText, Search, Globe, Star, Clock, CheckSquare, Square } from "lucide-react"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { format } from "date-fns"
import EmptyState from "@/components/ui/EmptyState"
import PageHeader from "@/components/layout/PageHeader"
import Pagination from "@/components/ui/Pagination"
import { CardGridSkeleton } from "@/components/ui/Skeleton"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import Link from "next/link"
import {
	usePostsList,
	useDeletePost,
	useTogglePublishPost,
	useBulkPublishPosts,
	useBulkDeletePosts,
} from "@/lib/queries/posts"
import { usePostCategoriesList } from "@/lib/queries/post-categories"

export default function PostsPage() {
	const router = useRouter()
	const [page, setPage] = useState(1)
	const [limit, setLimit] = useState(20)
	const [search, setSearch] = useState("")
	const [debouncedSearch, setDebouncedSearch] = useState("")
	const [statusFilter, setStatusFilter] = useState<PostStatus>("all")
	const [categoryFilter, setCategoryFilter] = useState("")
	const [featuredOnly, setFeaturedOnly] = useState(false)
	const [selected, setSelected] = useState<Set<string>>(new Set())

	useEffect(() => {
		const t = setTimeout(() => {
			setDebouncedSearch(search.trim())
			setPage(1)
		}, 300)
		return () => clearTimeout(t)
	}, [search])

	const onCategoryChange = (id: string) => { setCategoryFilter(id); setPage(1); setSelected(new Set()) }
	const onStatusChange = (s: PostStatus) => { setStatusFilter(s); setPage(1); setSelected(new Set()) }
	const onLimitChange = (n: number) => { setLimit(n); setPage(1) }
	const onFeaturedToggle = () => { setFeaturedOnly((v) => !v); setPage(1); setSelected(new Set()) }

	const categoriesQuery = usePostCategoriesList({ limit: 100 })
	const categories = categoriesQuery.data?.items ?? []

	const postsQuery = usePostsList({
		page,
		limit,
		search: debouncedSearch || undefined,
		category_id: categoryFilter || undefined,
		status: statusFilter,
		featured: featuredOnly || undefined,
	})
	const posts = useMemo(() => postsQuery.data?.items ?? [], [postsQuery.data])
	const total = postsQuery.data?.pagination.total ?? 0
	const pages = postsQuery.data?.pagination.pages ?? 1
	const isLoading = postsQuery.isLoading

	const deletePost = useDeletePost()
	const togglePublish = useTogglePublishPost()
	const bulkPublish = useBulkPublishPosts()
	const bulkDelete = useBulkDeletePosts()
	const { confirm, dialog } = useConfirm()

	const handleDelete = async (post: Post) => {
		const ok = await confirm({
			title: `حذف هذه المقالة؟`,
			description: post.is_published
				? "المقالة منشورة حالياً وستختفي من الموقع فوراً."
				: "ستُنقل إلى سلة المهملات. يمكنك استعادتها من صفحة المهملات.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		deletePost.mutate(post.id, {
			onSuccess: () => toast.success("تم الحذف"),
			onError: (e) => toast.error(getErrorMessage(e, "فشل الحذف")),
		})
	}

	const handleTogglePublish = (post: Post) => {
		togglePublish.mutate(
			{ id: post.id, is_published: !post.is_published },
			{
				onSuccess: () => toast.success(post.is_published ? "تم سحب النشر" : "تم النشر"),
				onError: (e) => toast.error(getErrorMessage(e, "تعذّر التحديث")),
			},
		)
	}

	const toggleSelected = (id: string) => {
		setSelected((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id); else next.add(id)
			return next
		})
	}
	const toggleSelectAll = () => {
		if (selected.size === posts.length) setSelected(new Set())
		else setSelected(new Set(posts.map((p) => p.id)))
	}

	const handleBulkPublish = async (is_published: boolean) => {
		const ids = Array.from(selected)
		if (!ids.length) return
		const ok = await confirm({
			title: is_published ? `نشر ${ids.length} مقالة؟` : `سحب نشر ${ids.length} مقالة؟`,
			description: "سيُسجَّل كل تغيير في سجل التدقيق.",
			confirmText: is_published ? "نشر" : "سحب",
			tone: is_published ? "success" : "warning",
		})
		if (!ok) return
		bulkPublish.mutate(
			{ ids, is_published },
			{
				onSuccess: ({ data }) => {
					toast.success(`${data.affected} مقالة ${is_published ? "نُشرت" : "سُحبت"}`)
					setSelected(new Set())
				},
				onError: (e) => toast.error(getErrorMessage(e, "فشلت العملية")),
			},
		)
	}

	const handleBulkDelete = async () => {
		const ids = Array.from(selected)
		if (!ids.length) return
		const ok = await confirm({
			title: `حذف ${ids.length} مقالة؟`,
			description: "ستُنقل إلى سلة المهملات. يمكنك استعادتها لاحقاً.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		bulkDelete.mutate(ids, {
			onSuccess: ({ data }) => {
				toast.success(`تم حذف ${data.affected} مقالة`)
				setSelected(new Set())
			},
			onError: (e) => toast.error(getErrorMessage(e, "فشل الحذف")),
		})
	}

	const titleOf = (p: Post) =>
		pickTranslation(p.post_translations, p.translation)?.title || "بدون عنوان"

	const readingTimeOf = (p: Post) =>
		pickTranslation(p.post_translations, p.translation)?.reading_time_minutes ?? 0

	const hasFilters = !!debouncedSearch || statusFilter !== "all" || !!categoryFilter || featuredOnly

	const statusBadge = (post: Post) => {
		if (post.is_published) return { label: "منشور", color: "bg-green-500/90 text-white" }
		if (post.published_at && new Date(post.published_at) > new Date()) {
			return { label: "مجدول", color: "bg-blue-500/90 text-white" }
		}
		return { label: "مسودة", color: "bg-gray-700/80 text-white" }
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="المقالات"
				description="أنشئ ونشر المقالات بعدة لغات. اسحب الصور والمحتوى من مكتبة الوسائط."
				icon={FileText}
				actions={
					<div className="flex gap-2">
						<Link href="/dashboard/posts/trash" className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors">
							<Trash2 className="h-4 w-4" />سلة المهملات
						</Link>
						<button onClick={() => router.push("/dashboard/posts/new")} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 shadow-soft hover:shadow-raise transition-all active:translate-y-px">
							<Plus className="h-4 w-4" />مقالة جديدة
						</button>
					</div>
				}
			/>

			<div className="surface-soft rounded-2xl p-3 flex flex-wrap gap-2.5 items-center shadow-soft">
				<div className="relative flex-1 min-w-50 group">
					<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
					<input
						value={search} onChange={(e) => setSearch(e.target.value)}
						placeholder="ابحث في العنوان أو المحتوى..."
						className="w-full pr-9 pl-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
					/>
				</div>
				<select value={categoryFilter} onChange={(e) => onCategoryChange(e.target.value)} className="cursor-pointer px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all">
					<option value="">كل التصنيفات</option>
					{categories.map((c) => (
						<option key={c.id} value={c.id}>{categoryName(c.post_category_translations, c.translation)}</option>
					))}
				</select>
				<div className="flex gap-0.5 bg-white border border-gray-200 rounded-lg p-0.5 shadow-soft">
					{([
						["all", "الكل"],
						["published", "منشور"],
						["scheduled", "مجدول"],
						["draft", "مسودة"],
					] as const).map(([k, l]) => (
						<button key={k} onClick={() => onStatusChange(k)}
							className={`cursor-pointer px-3 py-1.5 text-xs font-medium rounded-md transition-all ${statusFilter === k ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:text-primary hover:bg-primary/5"}`}>
							{l}
						</button>
					))}
				</div>
				<button
					onClick={onFeaturedToggle}
					className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${featuredOnly ? "bg-amber-50 text-amber-800 border-amber-300 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:bg-amber-50/40 hover:border-amber-200 hover:text-amber-700"}`}
				>
					<Star className={`h-3.5 w-3.5 ${featuredOnly ? "fill-amber-400 text-amber-500" : ""}`} />مميّز
				</button>
			</div>

			{selected.size > 0 && (
				<div className="sticky top-2 z-10 bg-white/95 backdrop-blur-md border border-primary/30 ring-1 ring-primary/10 rounded-2xl p-3 flex flex-wrap items-center gap-2 shadow-raise animate-slide-up">
					<div className="flex items-center gap-2 ps-1">
						<span className="inline-flex items-center justify-center h-7 min-w-7 px-1.5 rounded-full bg-primary text-white text-xs font-bold tabular-nums">{selected.size}</span>
						<span className="text-sm font-medium text-gray-700">محدّدة</span>
					</div>
					<div className="h-5 w-px bg-gray-200 mx-1" />
					<button onClick={() => handleBulkPublish(true)} className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-soft transition-colors">نشر الكل</button>
					<button onClick={() => handleBulkPublish(false)} className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 shadow-soft transition-colors">سحب النشر</button>
					<button onClick={handleBulkDelete} className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-soft transition-colors">حذف</button>
					<button onClick={() => setSelected(new Set())} className="cursor-pointer ms-auto text-xs text-gray-500 hover:text-gray-900 hover:underline">إلغاء التحديد</button>
				</div>
			)}

			{posts.length > 0 && (
				<div className="flex items-center gap-2 px-1">
					<button
						onClick={toggleSelectAll}
						className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-primary"
					>
						{selected.size === posts.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
						تحديد الكل في هذه الصفحة
					</button>
				</div>
			)}

			{isLoading ? (
				<CardGridSkeleton count={6} aspect="aspect-[16/9]" cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />
			) : posts.length === 0 ? (
				<EmptyState
					variant="card"
					icon={FileText}
					title={hasFilters ? "لا توجد نتائج للفلاتر الحالية" : "لا توجد مقالات بعد"}
					description={hasFilters ? "جرّب تعديل الفلاتر أو مسحها." : "ابدأ بإنشاء مقالتك الأولى. يمكنك إضافة صور، تنسيق المحتوى، ونشره بعدة لغات."}
					action={(
						<button onClick={() => router.push("/dashboard/posts/new")} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90">
							<Plus className="h-4 w-4" />{hasFilters ? "أنشئ مقالة جديدة" : "ابدأ بأول مقالة"}
						</button>
					)}
				/>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{posts.map((post) => {
						const thumb = post.media?.url || null
						const cat = post.post_categories
							? categoryName(post.post_categories.post_category_translations, post.post_categories.translation)
							: ""
						const isSel = selected.has(post.id)
						const badge = statusBadge(post)
						const minutes = readingTimeOf(post)
						return (
							<div key={post.id} className={`group bg-white rounded-2xl border overflow-hidden shadow-soft transition-all duration-200 cursor-pointer ${isSel ? "border-primary ring-2 ring-primary/20 shadow-raise" : "border-gray-200 hover:border-primary/30 hover:shadow-raise hover:-translate-y-0.5"}`}>
								<div className="relative">
									<button
										onClick={(e) => { e.stopPropagation(); toggleSelected(post.id) }}
										className={`absolute top-2.5 left-2.5 z-10 p-1.5 rounded-lg backdrop-blur-sm shadow-soft transition-all ${isSel ? "bg-primary text-white" : "bg-white/95 hover:bg-white text-gray-500 hover:text-primary"}`}
										title={isSel ? "إلغاء التحديد" : "تحديد"}
									>
										{isSel ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
									</button>
									<button onClick={() => router.push(`/dashboard/posts/${post.id}`)} className="cursor-pointer block w-full text-right">
										<div className="aspect-video bg-linear-to-br from-gray-100 to-gray-200 relative overflow-hidden">
											{thumb ? (
												<img src={thumb} alt="" className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out" />
											) : (
												<div className="w-full h-full flex items-center justify-center">
													<FileText className="h-12 w-12 text-gray-300" />
												</div>
											)}
											{/* gradient overlay at bottom to keep view-count readable on bright images */}
											<div className="absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-black/40 to-transparent pointer-events-none" />
											<div className="absolute top-2.5 right-2.5 flex gap-1.5 flex-wrap justify-end max-w-[calc(100%-3.5rem)]">
												{post.is_featured && (
													<span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-400/95 text-amber-950 backdrop-blur-sm shadow-sm inline-flex items-center gap-1"><Star className="h-3 w-3 fill-current" />مميّز</span>
												)}
												<span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full backdrop-blur-sm shadow-sm ${badge.color}`}>
													{badge.label}
												</span>
												{cat && <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-white/95 text-gray-800 backdrop-blur-sm shadow-sm">{cat}</span>}
											</div>
											<div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 text-white text-[11px] font-medium bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
												<Eye className="h-3 w-3" />{(post.views ?? 0).toLocaleString("ar-EG")}
											</div>
										</div>
										<div className="p-4">
											<h3 className="font-semibold text-gray-900 line-clamp-2 mb-1.5 leading-snug group-hover:text-primary transition-colors">{titleOf(post)}</h3>
											<p className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
												<span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" />{post.post_translations?.length ?? 1} {post.post_translations?.length === 1 ? "ترجمة" : "ترجمات"}</span>
												{minutes > 0 && (
													<>
														<span className="text-gray-300">·</span>
														<span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{minutes} د قراءة</span>
													</>
												)}
												<span className="text-gray-300">·</span>
												<span>{post.created_at ? format(new Date(post.created_at), "dd/MM/yyyy") : ""}</span>
											</p>
										</div>
									</button>
								</div>
								<div className="px-4 py-2.5 flex items-center justify-between border-t border-gray-100 bg-gray-50/40">
									<button onClick={() => handleTogglePublish(post)} className={`cursor-pointer text-xs font-semibold transition-colors ${post.is_published ? "text-amber-700 hover:text-amber-800" : "text-emerald-700 hover:text-emerald-800"}`}>
										{post.is_published ? "↩ سحب النشر" : "↗ نشر"}
									</button>
									<div className="flex gap-1">
										<button onClick={() => router.push(`/dashboard/posts/${post.id}`)} className="cursor-pointer p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors" title="تعديل"><Edit className="h-4 w-4" /></button>
										<button onClick={() => handleDelete(post)} className="cursor-pointer p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="حذف"><Trash2 className="h-4 w-4" /></button>
									</div>
								</div>
							</div>
						)
					})}
				</div>
			)}

			<Pagination
				page={page} pages={pages} total={total} limit={limit}
				onPage={setPage} onLimit={onLimitChange}
			/>
			{dialog}
		</div>
	)
}
