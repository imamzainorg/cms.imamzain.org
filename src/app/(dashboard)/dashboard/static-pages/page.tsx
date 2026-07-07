"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { StaticPage } from "@/types"
import { pickTranslation } from "@/lib/i18n"
import { useListPage } from "@/lib/use-list-page"
import { Plus, Edit2, Trash2, Eye, LayoutTemplate } from "lucide-react"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { safeFormat, formatArNumber, toArabicDigits } from "@/lib/dates"
import EmptyState from "@/components/ui/EmptyState"
import Badge from "@/components/ui/Badge"
import PageHeader from "@/components/layout/PageHeader"
import Pagination from "@/components/ui/Pagination"
import FilterPills from "@/components/ui/FilterPills"
import { ListSkeleton } from "@/components/ui/Skeleton"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import {
	useStaticPagesList,
	useDeleteStaticPage,
	useToggleStaticPagePublish,
} from "@/lib/queries/static-pages"

type StatusFilter = "all" | "published" | "draft"

export default function StaticPagesPage() {
	const router = useRouter()
	const { confirm, dialog } = useConfirm()
	const { page, setPage, limit, setLimit, resetPageAndSelection } = useListPage()
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

	const onStatusChange = (s: StatusFilter) => {
		setStatusFilter(s)
		resetPageAndSelection()
	}

	const pagesQuery = useStaticPagesList({
		page,
		limit,
		is_published: statusFilter === "all" ? undefined : statusFilter === "published",
	})
	const items = pagesQuery.data?.items ?? []
	const total = pagesQuery.data?.pagination.total ?? 0
	const pageCount = pagesQuery.data?.pagination.pages ?? 1
	const isLoading = pagesQuery.isLoading

	const deletePage = useDeleteStaticPage()
	const togglePublish = useToggleStaticPagePublish()

	const handleDelete = async (p: StaticPage) => {
		const ok = await confirm({
			title: "حذف هذه الصفحة؟",
			description: p.is_published
				? "الصفحة منشورة حالياً وستختفي من الموقع فوراً. ستُنقل إلى سلة المهملات ويمكن استعادتها لاحقاً."
				: "ستُنقل إلى سلة المهملات. يمكنك استعادتها من صفحة المهملات.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		deletePage.mutate(p.id, {
			onSuccess: () => toast.success("تم الحذف"),
			onError: (e) => toast.error(getErrorMessage(e, "فشل الحذف")),
		})
	}

	const handleTogglePublish = (p: StaticPage) => {
		togglePublish.mutate(
			{ id: p.id, is_published: !p.is_published },
			{
				onSuccess: () => toast.success(p.is_published ? "تم سحب النشر" : "تم النشر"),
				onError: (e) => toast.error(getErrorMessage(e, "تعذّر التحديث")),
			},
		)
	}

	const translationOf = (p: StaticPage) =>
		pickTranslation(p.static_page_translations, p.translation)

	const hasFilters = statusFilter !== "all"

	return (
		<div className="space-y-6">
			<PageHeader
				title="الصفحات الثابتة"
				description="صفحات المحتوى الدائم على الموقع — سيرة، تعريف، سياسات — بعدة لغات."
				icon={LayoutTemplate}
				actions={
					<div className="flex gap-2">
						<Link
							href="/dashboard/static-pages/trash"
							className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm text-foreground border border-[hsl(var(--border-strong))] rounded-md hover:bg-surface-muted transition-colors"
						>
							<Trash2 className="h-4 w-4" strokeWidth={1.6} />سلة المهملات
						</Link>
						<button
							onClick={() => router.push("/dashboard/static-pages/new")}
							className="cursor-pointer inline-flex items-center gap-2 px-4 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-[hsl(var(--primary)/0.92)] shadow-soft hover:shadow-raise transition-all active:translate-y-px"
						>
							<Plus className="h-4 w-4" strokeWidth={1.6} />صفحة جديدة
						</button>
					</div>
				}
			/>

			<div className="surface-soft rounded-xl p-3 flex flex-wrap gap-2.5 items-center shadow-soft">
				<FilterPills<StatusFilter>
					value={statusFilter}
					onChange={onStatusChange}
					variant="segmented"
					options={[
						{ value: "all", label: "الكل" },
						{ value: "published", label: "منشورة" },
						{ value: "draft", label: "مسودة" },
					]}
				/>
			</div>

			{isLoading ? (
				<div className="bg-white rounded-xl border border-[hsl(var(--border))] shadow-soft overflow-hidden">
					<ListSkeleton rows={8} />
				</div>
			) : items.length === 0 ? (
				<EmptyState
					variant="card"
					icon={LayoutTemplate}
					title={hasFilters ? "لا توجد نتائج للفلتر الحالي" : "لا توجد صفحات ثابتة بعد"}
					description={
						hasFilters
							? "جرّب تغيير الفلتر أو مسحه."
							: "أنشئ أول صفحة ثابتة — سيرة الإمام، تعريف بالمؤسسة، أو سياسة الخصوصية."
					}
					action={
						<button
							onClick={() => router.push("/dashboard/static-pages/new")}
							className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-[hsl(var(--primary)/0.92)] shadow-soft hover:shadow-raise transition-all"
						>
							<Plus className="h-4 w-4" strokeWidth={1.6} />
							{hasFilters ? "أنشئ صفحة جديدة" : "ابدأ بأول صفحة"}
						</button>
					}
				/>
			) : (
				<div className="bg-white rounded-xl border border-[hsl(var(--border))] shadow-soft">
					<table className="w-full text-sm">
						<thead className="bg-surface-muted">
							<tr>
								<th className="px-4 py-2.5 text-right text-[11px] font-semibold text-[hsl(var(--foreground-muted))] uppercase tracking-[0.04em] border-b border-[hsl(var(--border))]">
									العنوان
								</th>
								<th className="px-4 py-2.5 text-right text-[11px] font-semibold text-[hsl(var(--foreground-muted))] uppercase tracking-[0.04em] border-b border-[hsl(var(--border))]">
									الرابط المختصر
								</th>
								<th className="px-4 py-2.5 text-right text-[11px] font-semibold text-[hsl(var(--foreground-muted))] uppercase tracking-[0.04em] border-b border-[hsl(var(--border))]">
									الترتيب
								</th>
								<th className="px-4 py-2.5 text-right text-[11px] font-semibold text-[hsl(var(--foreground-muted))] uppercase tracking-[0.04em] border-b border-[hsl(var(--border))]">
									الحالة
								</th>
								<th className="px-4 py-2.5 text-right text-[11px] font-semibold text-[hsl(var(--foreground-muted))] uppercase tracking-[0.04em] border-b border-[hsl(var(--border))]">
									التاريخ
								</th>
								<th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[hsl(var(--foreground-muted))] uppercase tracking-[0.04em] border-b border-[hsl(var(--border))] w-24">
									إجراء
								</th>
							</tr>
						</thead>
						<tbody>
							{items.map((p, idx) => {
								const t = translationOf(p)
								return (
									<tr
										key={p.id}
										className={`border-b border-[hsl(var(--border))] last:border-b-0 transition-colors ${
											idx % 2 === 1 ? "bg-surface-muted/40" : ""
										} hover:bg-surface-muted`}
									>
										<td className="px-4 py-3 align-middle">
											<Link
												href={`/dashboard/static-pages/${p.id}`}
												className="cursor-pointer text-right hover:text-primary transition-colors"
											>
												<span className="text-[13px] font-medium text-foreground line-clamp-1">
													{t?.title || "بدون عنوان"}
												</span>
											</Link>
										</td>
										<td className="px-4 py-3 align-middle">
											<span dir="ltr" className="font-mono text-xs text-[hsl(var(--foreground-muted))]">
												{t?.slug ? `/${t.slug}` : "—"}
											</span>
										</td>
										<td className="px-4 py-3 align-middle text-[12.5px] text-[hsl(var(--foreground-muted))] arabic-nums tabular-nums">
											{formatArNumber(p.display_order)}
										</td>
										<td className="px-4 py-3 align-middle">
											<Badge variant={p.is_published ? "success" : "default"} dot>
												{p.is_published ? "منشورة" : "مسودة"}
											</Badge>
										</td>
										<td className="px-4 py-3 align-middle text-[12.5px] text-[hsl(var(--foreground-muted))] arabic-nums tabular-nums tracking-wider">
											{toArabicDigits(safeFormat(p.created_at, "dd / MM / yyyy"))}
										</td>
										<td className="px-4 py-3 align-middle">
											<div className="flex items-center gap-2.5 justify-start">
												<button
													onClick={() => handleTogglePublish(p)}
													className="cursor-pointer text-[hsl(var(--foreground-muted))] hover:text-primary transition-colors"
													title={p.is_published ? "سحب النشر" : "نشر"}
												>
													<Eye className="h-3.5 w-3.5" strokeWidth={1.6} />
												</button>
												<button
													onClick={() => router.push(`/dashboard/static-pages/${p.id}`)}
													className="cursor-pointer text-[hsl(var(--foreground-muted))] hover:text-primary transition-colors"
													title="تعديل"
												>
													<Edit2 className="h-3.5 w-3.5" strokeWidth={1.6} />
												</button>
												<button
													onClick={() => handleDelete(p)}
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
			)}

			<Pagination page={page} pages={pageCount} total={total} limit={limit} onPage={setPage} onLimit={setLimit} />
			{dialog}
		</div>
	)
}
