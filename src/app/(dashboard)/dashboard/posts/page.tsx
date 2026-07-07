"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import type { Post, PostStatus } from "@/types"
import { categoryName, pickTranslation } from "@/lib/i18n"
import { useListPage } from "@/lib/use-list-page"
import {
	Plus,
	Edit2,
	Trash2,
	Eye,
	FileText,
	Search,
	Globe,
	Star,
	CheckSquare,
	Square,
	LayoutGrid,
	Rows3,
} from "lucide-react"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { safeFormat, formatArNumber, toArabicDigits } from "@/lib/dates"
import EmptyState from "@/components/ui/EmptyState"
import Badge from "@/components/ui/Badge"
import PageHeader from "@/components/layout/PageHeader"
import Pagination from "@/components/ui/Pagination"
import CategoryFilterSelect from "@/components/ui/CategoryFilterSelect"
import { CardGridSkeleton, ListSkeleton } from "@/components/ui/Skeleton"
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

	// Shared list-page state: pagination, debounced search, selection set,
	// view-mode toggle persisted to localStorage under "posts:view".
	const {
		page,
		setPage,
		limit,
		setLimit,
		search,
		setSearch,
		debouncedSearch,
		selected,
		toggleSelected,
		clearSelected,
		selectMany,
		viewMode,
		setView,
		resetPageAndSelection,
	} = useListPage({ viewStorageKey: "posts:view" })

	// Per-page filters not owned by useListPage. Each handler pipes through
	// resetPageAndSelection so changing a filter takes the user back to page 1
	// and drops any selection (which is page-scoped).
	const [statusFilter, setStatusFilter] = useState<PostStatus>("all")
	const [categoryFilter, setCategoryFilter] = useState("")
	const [featuredOnly, setFeaturedOnly] = useState(false)

	const onCategoryChange = (id: string) => {
		setCategoryFilter(id)
		resetPageAndSelection()
	}
	const onStatusChange = (s: PostStatus) => {
		setStatusFilter(s)
		resetPageAndSelection()
	}
	const onFeaturedToggle = () => {
		setFeaturedOnly((v) => !v)
		resetPageAndSelection()
	}

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

	const toggleSelectAll = () => {
		if (selected.size === posts.length) clearSelected()
		else selectMany(posts.map((p) => p.id))
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
					const verb = is_published ? "نُشرت" : "سُحبت"
					const main = `${data.affected} مقالة ${verb}`
					const note = data.skipped.length > 0
						? ` — تجاوز ${data.skipped.length} (سبق نشرها أو محذوفة)`
						: ""
					toast.success(main + note)
					clearSelected()
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
				const main = `تم حذف ${data.affected} مقالة`
				const note = data.skipped.length > 0
					? ` — تجاوز ${data.skipped.length} (محذوفة بالفعل)`
					: ""
				toast.success(main + note)
				clearSelected()
			},
			onError: (e) => toast.error(getErrorMessage(e, "فشل الحذف")),
		})
	}

	const titleOf = (p: Post) =>
		pickTranslation(p.post_translations, p.translation)?.title || "بدون عنوان"

	const hasFilters =
		!!debouncedSearch || statusFilter !== "all" || !!categoryFilter || featuredOnly

	type StatusKind = "published" | "scheduled" | "draft"
	const statusOf = (post: Post): { kind: StatusKind; label: string } => {
		if (post.is_published) return { kind: "published", label: "منشور" }
		if (post.published_at && new Date(post.published_at) > new Date())
			return { kind: "scheduled", label: "مجدول" }
		return { kind: "draft", label: "مسودة" }
	}

	const statusVariant: Record<StatusKind, "success" | "info" | "default"> = {
		published: "success",
		scheduled: "info",
		draft: "default",
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="المقالات"
				description="أنشئ ونشر المقالات بعدة لغات. اسحب الصور والمحتوى من مكتبة الوسائط."
				icon={FileText}
				actions={
					<div className="flex gap-2">
						<Link
							href="/dashboard/posts/trash"
							className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm text-foreground border border-[hsl(var(--border-strong))] rounded-md hover:bg-surface-muted transition-colors"
						>
							<Trash2 className="h-4 w-4" strokeWidth={1.6} />سلة المهملات
						</Link>
						<button
							onClick={() => router.push("/dashboard/posts/new")}
							className="cursor-pointer inline-flex items-center gap-2 px-4 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-[hsl(var(--primary)/0.92)] shadow-soft hover:shadow-raise transition-all active:translate-y-px"
						>
							<Plus className="h-4 w-4" strokeWidth={1.6} />مقالة جديدة
						</button>
					</div>
				}
			/>

			{/* Filter toolbar — scrolls with the page; the THEAD takes over the
			    sticky role once you're inside the table. Multiple sticky elements
			    at top-16 would either stack (large gap to clear the thead) or
			    overlap. */}
			<div className="surface-soft rounded-xl p-3 flex flex-wrap gap-2.5 items-center shadow-soft">
				<div className="relative flex-1 min-w-50 group">
					<Search
						className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--foreground-subtle))] group-focus-within:text-primary transition-colors"
						strokeWidth={1.6}
					/>
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="ابحث في العنوان أو المحتوى..."
						className="w-full pr-9 pl-3 py-1.5 text-sm bg-white border border-[hsl(var(--border))] rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
					/>
				</div>
				<CategoryFilterSelect
					categories={categories}
					value={categoryFilter}
					onChange={onCategoryChange}
					getName={(c) => categoryName(c.post_category_translations, c.translation)}
				/>
				<div className="flex gap-0.5 bg-white border border-[hsl(var(--border))] rounded-md p-0.5 shadow-soft">
					{(
						[
							["all", "الكل"],
							["published", "منشور"],
							["scheduled", "مجدول"],
							["draft", "مسودة"],
						] as const
					).map(([k, l]) => (
						<button
							key={k}
							onClick={() => onStatusChange(k)}
							className={`cursor-pointer px-3 py-1 text-xs font-medium rounded transition-all ${
								statusFilter === k
									? "bg-primary text-white shadow-soft"
									: "text-[hsl(var(--foreground-muted))] hover:text-primary hover:bg-[hsl(var(--primary)/0.06)]"
							}`}
						>
							{l}
						</button>
					))}
				</div>
				<button
					onClick={onFeaturedToggle}
					className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md border transition-all ${
						featuredOnly
							? "bg-[hsl(var(--secondary-soft))] text-[hsl(var(--secondary-strong))] border-[hsl(var(--secondary)/0.4)] shadow-soft"
							: "bg-white text-[hsl(var(--foreground-muted))] border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary-soft))/0.5] hover:border-[hsl(var(--secondary)/0.3)] hover:text-[hsl(var(--secondary-strong))]"
					}`}
				>
					<Star
						className={`h-3.5 w-3.5 ${featuredOnly ? "fill-[hsl(var(--secondary))] text-[hsl(var(--secondary))]" : ""}`}
						strokeWidth={1.6}
					/>
					مميّز
				</button>
				{/* View-mode toggle: dense table (default) ↔ card grid */}
				<div className="ms-auto flex gap-0.5 bg-white border border-[hsl(var(--border))] rounded-md p-0.5 shadow-soft">
					<button
						onClick={() => setView("table")}
						aria-pressed={viewMode === "table"}
						title="عرض الجدول"
						className={`cursor-pointer p-1.5 rounded transition-all ${
							viewMode === "table"
								? "bg-primary text-white shadow-soft"
								: "text-[hsl(var(--foreground-muted))] hover:text-primary"
						}`}
					>
						<Rows3 className="h-4 w-4" strokeWidth={1.6} />
					</button>
					<button
						onClick={() => setView("grid")}
						aria-pressed={viewMode === "grid"}
						title="عرض البطاقات"
						className={`cursor-pointer p-1.5 rounded transition-all ${
							viewMode === "grid"
								? "bg-primary text-white shadow-soft"
								: "text-[hsl(var(--foreground-muted))] hover:text-primary"
						}`}
					>
						<LayoutGrid className="h-4 w-4" strokeWidth={1.6} />
					</button>
				</div>
			</div>

			{/* Bulk-action sticky bar — pins to top-16 (just below the page Header)
			    with z-20 so it covers the sticky thead when a selection is active. */}
			{selected.size > 0 && (
				<div className="sticky top-16 z-20 bg-white/95 backdrop-blur-md border border-[hsl(var(--primary)/0.3)] ring-1 ring-[hsl(var(--primary)/0.1)] rounded-xl p-3 flex flex-wrap items-center gap-2 shadow-raise animate-slide-up">
					<div className="flex items-center gap-2 ps-1">
						<span className="inline-flex items-center justify-center h-7 min-w-7 px-1.5 rounded-full bg-primary text-white text-xs font-bold arabic-nums tabular-nums">
							{formatArNumber(selected.size)}
						</span>
						<span className="text-sm font-medium text-foreground">محدّدة</span>
					</div>
					<div className="h-5 w-px bg-[hsl(var(--border))] mx-1" />
					<button
						onClick={() => handleBulkPublish(true)}
						className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[hsl(var(--success))] text-white rounded-md hover:bg-[hsl(var(--success-foreground))] shadow-soft transition-colors"
					>
						نشر الكل
					</button>
					<button
						onClick={() => handleBulkPublish(false)}
						className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[hsl(var(--warning))] text-white rounded-md hover:bg-[hsl(var(--warning-foreground))] shadow-soft transition-colors"
					>
						سحب النشر
					</button>
					<button
						onClick={handleBulkDelete}
						className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[hsl(var(--danger))] text-white rounded-md hover:bg-[hsl(var(--danger-foreground))] shadow-soft transition-colors"
					>
						حذف
					</button>
					<button
						onClick={clearSelected}
						className="cursor-pointer ms-auto text-xs text-[hsl(var(--foreground-muted))] hover:text-foreground hover:underline"
					>
						إلغاء التحديد
					</button>
				</div>
			)}

			{isLoading ? (
				viewMode === "grid" ? (
					<CardGridSkeleton
						count={6}
						aspect="aspect-[16/9]"
						cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
					/>
				) : (
					<div className="bg-white rounded-xl border border-[hsl(var(--border))] shadow-soft overflow-hidden">
						<ListSkeleton rows={8} />
					</div>
				)
			) : posts.length === 0 ? (
				<EmptyState
					variant="card"
					icon={FileText}
					title={hasFilters ? "لا توجد نتائج للفلاتر الحالية" : "لا توجد مقالات بعد"}
					description={
						hasFilters
							? "جرّب تعديل الفلاتر أو مسحها."
							: "ابدأ بإنشاء مقالتك الأولى. يمكنك إضافة صور، تنسيق المحتوى، ونشره بعدة لغات."
					}
					action={
						<button
							onClick={() => router.push("/dashboard/posts/new")}
							className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-[hsl(var(--primary)/0.92)] shadow-soft hover:shadow-raise transition-all"
						>
							<Plus className="h-4 w-4" strokeWidth={1.6} />
							{hasFilters ? "أنشئ مقالة جديدة" : "ابدأ بأول مقالة"}
						</button>
					}
				/>
			) : viewMode === "table" ? (
				<DenseTable
					posts={posts}
					selected={selected}
					onToggleSelected={toggleSelected}
					onToggleSelectAll={toggleSelectAll}
					onEdit={(p) => router.push(`/dashboard/posts/${p.id}`)}
					onDelete={handleDelete}
					onTogglePublish={handleTogglePublish}
					titleOf={titleOf}
					statusOf={statusOf}
					statusVariant={statusVariant}
				/>
			) : (
				<CardGrid
					posts={posts}
					selected={selected}
					onToggleSelected={toggleSelected}
					onEdit={(p) => router.push(`/dashboard/posts/${p.id}`)}
					onDelete={handleDelete}
					onTogglePublish={handleTogglePublish}
					titleOf={titleOf}
					statusOf={statusOf}
				/>
			)}

			<Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} onLimit={setLimit} />
			{dialog}
		</div>
	)
}

/* ============================================================================
   Dense table — default view. Zebra rows, sticky header, inline status pill,
   inline action icons, multi-select column.
   ========================================================================== */

type StatusKind = "published" | "scheduled" | "draft"

interface TableProps {
	posts: Post[]
	selected: Set<string>
	onToggleSelected: (id: string) => void
	onToggleSelectAll: () => void
	onEdit: (p: Post) => void
	onDelete: (p: Post) => void
	onTogglePublish: (p: Post) => void
	titleOf: (p: Post) => string
	statusOf: (p: Post) => { kind: StatusKind; label: string }
	statusVariant: Record<StatusKind, "success" | "info" | "default">
}

function DenseTable({
	posts,
	selected,
	onToggleSelected,
	onToggleSelectAll,
	onEdit,
	onDelete,
	onTogglePublish,
	titleOf,
	statusOf,
	statusVariant,
}: TableProps) {
	const allSelected = posts.length > 0 && selected.size === posts.length
	// The thead is sticky at top-16 (right below the Header). Note: it MUST NOT
	// be wrapped in any element with `overflow-x: auto` / `overflow-y: auto` /
	// `overflow: hidden` — that creates a scrolling context and the thead would
	// stick to the wrapper's top instead of the page viewport. So no overflow
	// clipping on the card wrapper either.
	return (
		<div className="bg-white rounded-xl border border-[hsl(var(--border))] shadow-soft">
			<table className="w-full text-sm">
				<thead className="bg-surface-muted sticky top-16 z-10 shadow-[0_1px_0_0_hsl(var(--border))]">
						<tr>
							<th className="w-10 px-3 py-2.5">
								<button
									onClick={onToggleSelectAll}
									className="cursor-pointer text-[hsl(var(--foreground-muted))] hover:text-primary"
									aria-label={allSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
								>
									{allSelected ? (
										<CheckSquare className="h-4 w-4" strokeWidth={1.6} />
									) : (
										<Square className="h-4 w-4" strokeWidth={1.6} />
									)}
								</button>
							</th>
							<th className="px-3 py-2.5 text-right text-[11px] font-semibold text-[hsl(var(--foreground-muted))] uppercase tracking-[0.04em] border-b border-[hsl(var(--border))]">
								العنوان
							</th>
							<th className="px-3 py-2.5 text-right text-[11px] font-semibold text-[hsl(var(--foreground-muted))] uppercase tracking-[0.04em] border-b border-[hsl(var(--border))]">
								التصنيف
							</th>
							<th className="px-3 py-2.5 text-right text-[11px] font-semibold text-[hsl(var(--foreground-muted))] uppercase tracking-[0.04em] border-b border-[hsl(var(--border))]">
								الحالة
							</th>
							<th className="px-3 py-2.5 text-right text-[11px] font-semibold text-[hsl(var(--foreground-muted))] uppercase tracking-[0.04em] border-b border-[hsl(var(--border))]">
								المشاهدات
							</th>
							<th className="px-3 py-2.5 text-right text-[11px] font-semibold text-[hsl(var(--foreground-muted))] uppercase tracking-[0.04em] border-b border-[hsl(var(--border))]">
								التاريخ
							</th>
							<th className="px-3 py-2.5 text-left text-[11px] font-semibold text-[hsl(var(--foreground-muted))] uppercase tracking-[0.04em] border-b border-[hsl(var(--border))] w-24">
								إجراء
							</th>
						</tr>
					</thead>
					<tbody>
						{posts.map((post, idx) => {
							const isSel = selected.has(post.id)
							const status = statusOf(post)
							const cat = post.post_categories
								? categoryName(
										post.post_categories.post_category_translations,
										post.post_categories.translation,
									)
								: ""
							return (
								<tr
									key={post.id}
									className={`border-b border-[hsl(var(--border))] last:border-b-0 transition-colors ${
										isSel ? "bg-[hsl(var(--accent))]" : idx % 2 === 1 ? "bg-surface-muted/40" : ""
									} hover:bg-surface-muted`}
								>
									<td className="px-3 py-3 align-middle">
										<button
											onClick={() => onToggleSelected(post.id)}
											className="cursor-pointer text-[hsl(var(--foreground-muted))] hover:text-primary"
											aria-label={isSel ? "إلغاء التحديد" : "تحديد"}
										>
											{isSel ? (
												<CheckSquare className="h-4 w-4 text-primary" strokeWidth={1.6} />
											) : (
												<Square className="h-4 w-4" strokeWidth={1.6} />
											)}
										</button>
									</td>
									<td className="px-3 py-3 align-middle">
										<button
											onClick={() => onEdit(post)}
											className="cursor-pointer text-right hover:text-primary transition-colors"
										>
											<span className="inline-flex items-center gap-2">
												{post.is_featured && (
													<Star
														className="h-3.5 w-3.5 fill-[hsl(var(--secondary))] text-[hsl(var(--secondary))]"
														strokeWidth={1.6}
													/>
												)}
												<span className="text-[13px] font-medium text-foreground line-clamp-1">
													{titleOf(post)}
												</span>
											</span>
										</button>
									</td>
									<td className="px-3 py-3 align-middle text-[12.5px] text-[hsl(var(--foreground-muted))]">
										{cat || "—"}
									</td>
									<td className="px-3 py-3 align-middle">
										<Badge variant={statusVariant[status.kind]} dot>
											{status.label}
										</Badge>
									</td>
									<td className="px-3 py-3 align-middle text-[12.5px] text-[hsl(var(--foreground-muted))] arabic-nums tabular-nums">
										{post.views != null ? formatArNumber(post.views) : "—"}
									</td>
									<td className="px-3 py-3 align-middle text-[12.5px] text-[hsl(var(--foreground-muted))] arabic-nums tabular-nums tracking-wider">
										{toArabicDigits(safeFormat(post.created_at, "dd / MM / yyyy"))}
									</td>
									<td className="px-3 py-3 align-middle">
										<div className="flex items-center gap-2.5 justify-start opacity-75 group-hover:opacity-100">
											<button
												onClick={() => onTogglePublish(post)}
												className="cursor-pointer text-[hsl(var(--foreground-muted))] hover:text-primary transition-colors"
												title={post.is_published ? "سحب النشر" : "نشر"}
											>
												<Eye className="h-3.5 w-3.5" strokeWidth={1.6} />
											</button>
											<button
												onClick={() => onEdit(post)}
												className="cursor-pointer text-[hsl(var(--foreground-muted))] hover:text-primary transition-colors"
												title="تعديل"
											>
												<Edit2 className="h-3.5 w-3.5" strokeWidth={1.6} />
											</button>
											<button
												onClick={() => onDelete(post)}
												className="cursor-pointer text-[hsl(var(--danger))] hover:text-[hsl(var(--danger-foreground))] transition-colors"
												title="حذف"
											>
												<Trash2 className="h-3.5 w-3.5" strokeWidth={1.6} />
											</button>
										</div>
									</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>
		)
}

/* ============================================================================
   Card grid — opt-in view via the toolbar toggle. Same data, more visual.
   ========================================================================== */

interface GridProps {
	posts: Post[]
	selected: Set<string>
	onToggleSelected: (id: string) => void
	onEdit: (p: Post) => void
	onDelete: (p: Post) => void
	onTogglePublish: (p: Post) => void
	titleOf: (p: Post) => string
	statusOf: (p: Post) => { kind: StatusKind; label: string }
}

function CardGrid({
	posts,
	selected,
	onToggleSelected,
	onEdit,
	onDelete,
	onTogglePublish,
	titleOf,
	statusOf,
}: GridProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{posts.map((post) => {
				// Cover image first; fall back to the first attachment thumbnail
				// the slim list payload embeds (round 15.2).
				const thumb = post.media?.url || post.post_attachments?.[0]?.media?.url || null
				const isSel = selected.has(post.id)
				const status = statusOf(post)
				return (
					<div
						key={post.id}
						className={`group bg-white rounded-xl border overflow-hidden shadow-soft transition-all duration-200 ${
							isSel
								? "border-primary ring-2 ring-[hsl(var(--primary)/0.2)] shadow-raise"
								: "border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.3)] hover:shadow-raise hover:-translate-y-px"
						}`}
					>
						<div className="relative">
							<button
								onClick={(e) => {
									e.stopPropagation()
									onToggleSelected(post.id)
								}}
								className={`absolute top-2.5 left-2.5 z-10 p-1.5 rounded-md backdrop-blur-sm shadow-soft transition-all ${
									isSel
										? "bg-primary text-white"
										: "bg-white/95 hover:bg-white text-[hsl(var(--foreground-muted))] hover:text-primary"
								}`}
								title={isSel ? "إلغاء التحديد" : "تحديد"}
							>
								{isSel ? (
									<CheckSquare className="h-4 w-4" strokeWidth={1.6} />
								) : (
									<Square className="h-4 w-4" strokeWidth={1.6} />
								)}
							</button>
							<button
								onClick={() => onEdit(post)}
								className="cursor-pointer block w-full text-right"
							>
								<div className="aspect-video bg-surface-muted relative overflow-hidden">
									{thumb ? (
										<img
											src={thumb}
											alt=""
											className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
										/>
									) : (
										<div className="w-full h-full flex items-center justify-center">
											<FileText className="h-10 w-10 text-[hsl(var(--foreground-subtle))]" strokeWidth={1.4} />
										</div>
									)}
									<div className="absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-black/40 to-transparent pointer-events-none" />
									<div className="absolute top-2.5 right-2.5 flex gap-1.5 flex-wrap justify-end max-w-[calc(100%-3.5rem)]">
										{post.is_featured && (
											<span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-[hsl(var(--secondary))]/95 text-white shadow-soft inline-flex items-center gap-1">
												<Star className="h-3 w-3 fill-current" strokeWidth={1.6} />
												مميّز
											</span>
										)}
										<span
											className={`px-2 py-0.5 text-[11px] font-semibold rounded-full shadow-soft ${
												status.kind === "published"
													? "bg-[hsl(var(--success))]/95 text-white"
													: status.kind === "scheduled"
														? "bg-[hsl(var(--info))]/95 text-white"
														: "bg-[hsl(var(--foreground)/0.75)] text-white"
											}`}
										>
											{status.label}
										</span>
									</div>
									<div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 text-white text-[11px] font-medium bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full arabic-nums tabular-nums">
										<Eye className="h-3 w-3" strokeWidth={1.6} />
										{formatArNumber(post.views ?? 0)}
									</div>
								</div>
								<div className="p-4">
									<h3 className="font-semibold text-foreground line-clamp-2 mb-1.5 leading-snug group-hover:text-primary transition-colors">
										{titleOf(post)}
									</h3>
									<p className="text-xs text-[hsl(var(--foreground-muted))] flex items-center gap-2 flex-wrap">
										<span className="inline-flex items-center gap-1 arabic-nums">
											<Globe className="h-3 w-3" strokeWidth={1.6} />
											{toArabicDigits(post.post_translations?.length ?? 1)}{" "}
											{post.post_translations?.length === 1 ? "ترجمة" : "ترجمات"}
										</span>
										<span className="text-[hsl(var(--foreground-subtle))]">·</span>
										<span className="arabic-nums tabular-nums">
											{toArabicDigits(safeFormat(post.created_at, "dd/MM/yyyy"))}
										</span>
									</p>
								</div>
							</button>
						</div>
						<div className="px-4 py-2.5 flex items-center justify-between border-t border-[hsl(var(--border))] bg-surface-muted/40">
							<button
								onClick={() => onTogglePublish(post)}
								className={`cursor-pointer text-xs font-semibold transition-colors ${
									post.is_published
										? "text-[hsl(var(--warning-foreground))] hover:text-[hsl(var(--warning))]"
										: "text-[hsl(var(--success-foreground))] hover:text-[hsl(var(--success))]"
								}`}
							>
								{post.is_published ? "↩ سحب النشر" : "↗ نشر"}
							</button>
							<div className="flex gap-1">
								<button
									onClick={() => onEdit(post)}
									className="cursor-pointer p-1.5 text-[hsl(var(--foreground-muted))] hover:text-primary hover:bg-[hsl(var(--primary)/0.08)] rounded-md transition-colors"
									title="تعديل"
								>
									<Edit2 className="h-4 w-4" strokeWidth={1.6} />
								</button>
								<button
									onClick={() => onDelete(post)}
									className="cursor-pointer p-1.5 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-soft))] rounded-md transition-colors"
									title="حذف"
								>
									<Trash2 className="h-4 w-4" strokeWidth={1.6} />
								</button>
							</div>
						</div>
					</div>
				)
			})}
		</div>
	)
}
