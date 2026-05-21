"use client"

import { useQueries } from "@tanstack/react-query"
import { useAuthStore } from "@/store/auth"
import type { Post } from "@/types"
import {
	BookOpen,
	FileText,
	Mail,
	Users,
	GraduationCap,
	Image as ImageIcon,
	Newspaper,
	ArrowLeft,
	Eye,
	Plus,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { safeFormat, formatArNumber, toArabicDigits } from "@/lib/dates"
import Badge from "@/components/ui/Badge"
import EmptyState from "@/components/ui/EmptyState"
import { StatGridSkeleton, Skeleton, ListSkeleton } from "@/components/ui/Skeleton"
import { useDashboardStats } from "@/lib/queries/dashboard"
import { usePostsList } from "@/lib/queries/posts"
import { mediaService } from "@/services/media.service"
import { queryKeys } from "@/lib/queries/keys"

export default function DashboardPage() {
	const { user } = useAuthStore()

	const statsQuery = useDashboardStats()
	const stats = statsQuery.data

	const recentPostsQuery = usePostsList({ limit: 5 })
	const recentPosts: Post[] = recentPostsQuery.data?.items ?? []

	const thumbIds = Array.from(
		new Set(recentPosts.map((p) => p.cover_image_id).filter((id): id is string => Boolean(id))),
	)
	const thumbQueries = useQueries({
		queries: thumbIds.map((id) => ({
			queryKey: queryKeys.media.detail(id),
			queryFn: async () => (await mediaService.get(id)).data,
		})),
	})
	const recentThumbs: Record<string, string> = {}
	thumbQueries.forEach((q, i) => {
		if (q.data) recentThumbs[thumbIds[i]] = q.data.url
	})

	if (statsQuery.isLoading || recentPostsQuery.isLoading) {
		return (
			<div className="space-y-6">
				<div className="bg-white rounded-xl border border-[hsl(var(--border))] p-6 space-y-2 shadow-soft">
					<Skeleton className="h-6 w-1/3" />
					<Skeleton className="h-4 w-2/3" />
				</div>
				<StatGridSkeleton count={4} />
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2 bg-white rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-soft">
						<div className="px-5 py-4 border-b border-[hsl(var(--border))]"><Skeleton className="h-4 w-1/4" /></div>
						<ListSkeleton rows={5} />
					</div>
					<div className="bg-white rounded-xl border border-[hsl(var(--border))] p-5 space-y-3 shadow-soft">
						<Skeleton className="h-4 w-1/3" />
						<Skeleton className="h-32 w-full" />
						<Skeleton className="h-32 w-full" />
					</div>
				</div>
			</div>
		)
	}

	const greeting = (() => {
		const h = new Date().getHours()
		if (h < 12) return "صباح الخير"
		if (h < 18) return "مساء الخير"
		return "أهلاً"
	})()

	const titleOf = (p: Post) =>
		p.translation?.title ||
		p.post_translations?.find((t) => t.is_default)?.title ||
		p.post_translations?.[0]?.title ||
		"بدون عنوان"

	const contentStats = [
		{ label: "المقالات", value: stats?.posts.total ?? 0, icon: FileText, href: "/dashboard/posts" },
		{ label: "الكتب", value: stats?.library.books ?? 0, icon: BookOpen, href: "/dashboard/books" },
		{ label: "الأبحاث", value: stats?.library.academic_papers ?? 0, icon: GraduationCap, href: "/dashboard/papers" },
		{ label: "صور المعرض", value: stats?.library.gallery_images ?? 0, icon: ImageIcon, href: "/dashboard/gallery" },
	]

	const inboxItems = [
		{
			label: "رسائل تواصل جديدة",
			value: stats?.forms.contact_new ?? 0,
			icon: Mail,
			href: "/dashboard/contacts",
		},
		{
			label: "طلبات زيارة قيد الانتظار",
			value: stats?.forms.proxy_visit_pending ?? 0,
			icon: Users,
			href: "/dashboard/proxy-visits",
		},
		{
			label: "مشتركو النشرة",
			value: stats?.newsletter.active_subscribers ?? 0,
			icon: Newspaper,
			href: "/dashboard/newsletter",
		},
	]

	const postsBreakdown = stats?.posts

	return (
		<div className="space-y-8">
			{/* Hero — calligraphic greeting on an emerald ground with a quiet
			    geometric ornament wash (eight-pointed star tessellation, ~6%). */}
			<div className="relative overflow-hidden rounded-xl bg-linear-to-bl from-primary via-[hsl(var(--primary)/0.94)] to-[hsl(var(--primary-strong))] text-white shadow-raise">
				<div
					className="absolute inset-0 ornament-tile pointer-events-none"
					style={{ opacity: 0.08, filter: "invert(1)" }}
					aria-hidden
				/>
				<div className="pointer-events-none absolute -bottom-24 -start-16 h-72 w-72 rounded-full bg-secondary/15 blur-3xl" />
				<div className="relative p-7 sm:p-9">
					<div className="flex items-center gap-2 mb-3">
						<div className="h-7 w-7 rounded-full bg-white/10 ring-1 ring-white/20 flex items-center justify-center">
							<Image
								src="/brand/logo/logo-icon-white.png"
								alt=""
								width={28}
								height={28}
								className="h-4 w-4 object-contain"
							/>
						</div>
						<p className="text-[11.5px] font-medium text-secondary/90 tracking-[0.08em]">
							لوحة التحكم
						</p>
					</div>
					<h1 className="text-3xl sm:text-4xl font-bold mb-2 leading-tight">
						{greeting}، {user?.username}
					</h1>
					<p className="text-white/80 text-sm max-w-2xl leading-relaxed">
						إليك ملخّصاً لمحتوى الموقع وآخر التفاعلات.
						{postsBreakdown && (
							<>
								{" "}نُشر{" "}
								<strong className="text-white font-semibold tabular-nums arabic-nums">
									{formatArNumber(postsBreakdown.published)}
								</strong>{" "}
								مقالة من أصل{" "}
								<strong className="text-white font-semibold tabular-nums arabic-nums">
									{formatArNumber(postsBreakdown.total)}
								</strong>{" "}
								<span className="text-white/65">
									({formatArNumber(postsBreakdown.drafts)} مسوّدة)
								</span>
								.
							</>
						)}
					</p>
					<div className="mt-6 flex flex-wrap gap-2">
						<Link
							href="/dashboard/posts/new"
							className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-primary text-sm font-semibold rounded-md hover:bg-white/95 hover:shadow-lg hover:-translate-y-px transition-all shadow-md"
						>
							<Plus className="h-4 w-4" strokeWidth={1.6} />مقالة جديدة
						</Link>
						<Link
							href="/dashboard/books/new"
							className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-md hover:bg-white/20 border border-white/20 transition-colors"
						>
							<Plus className="h-4 w-4" strokeWidth={1.6} />كتاب جديد
						</Link>
						<Link
							href="/dashboard/papers/new"
							className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-md hover:bg-white/20 border border-white/20 transition-colors"
						>
							<Plus className="h-4 w-4" strokeWidth={1.6} />بحث جديد
						</Link>
						<Link
							href="/dashboard/gallery"
							className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-md hover:bg-white/20 border border-white/20 transition-colors"
						>
							<ImageIcon className="h-4 w-4" strokeWidth={1.6} />رفع صور
						</Link>
					</div>
				</div>
			</div>

			{/* Content stat row — dense, brand-coherent. Each card is just an
			    icon disc, a tabular-nums value, and a label. No pastel tints. */}
			<section>
				<header className="flex items-center mb-3">
					<h2 className="text-[12px] font-semibold text-foreground tracking-wide">
						المحتوى
					</h2>
					<div className="flex-1 mx-3 divider-brand" />
				</header>
				<div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl bg-white border border-[hsl(var(--border))] shadow-soft overflow-hidden divide-x divide-x-reverse divide-[hsl(var(--border))]">
					{contentStats.map(({ label, value, icon: Icon, href }) => (
						<Link
							key={label}
							href={href}
							className="group relative px-5 py-5 hover:bg-surface-muted transition-colors"
						>
							<div className="flex items-center justify-between mb-3">
								<div className="h-9 w-9 rounded-md bg-[hsl(var(--primary)/0.07)] ring-1 ring-[hsl(var(--primary)/0.12)] flex items-center justify-center">
									<Icon className="h-4 w-4 text-primary" strokeWidth={1.6} />
								</div>
								<ArrowLeft
									className="h-3.5 w-3.5 text-[hsl(var(--foreground-subtle))] opacity-0 group-hover:opacity-100 group-hover:-translate-x-0.5 transition-all"
									strokeWidth={1.6}
								/>
							</div>
							<p className="text-[28px] font-normal text-foreground arabic-nums leading-none tracking-tight">
								{formatArNumber(value)}
							</p>
							<p className="text-[12.5px] text-[hsl(var(--foreground-muted))] mt-2">
								{label}
							</p>
						</Link>
					))}
				</div>
			</section>

			{/* Inbox panel — items that need attention as ROWS, not boxes. */}
			<section>
				<header className="flex items-center mb-3">
					<h2 className="text-[12px] font-semibold text-foreground tracking-wide">
						يحتاج إلى انتباهك
					</h2>
					<div className="flex-1 mx-3 divider-brand" />
				</header>
				<div className="bg-white rounded-xl border border-[hsl(var(--border))] shadow-soft overflow-hidden divide-y divide-[hsl(var(--border))]">
					{inboxItems.map(({ label, value, icon: Icon, href }) => {
						const urgent = value > 0 && label !== "مشتركو النشرة"
						return (
							<Link
								key={label}
								href={href}
								className="group flex items-center gap-4 px-5 py-3.5 hover:bg-surface-muted transition-colors"
							>
								<div
									className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${
										urgent
											? "bg-[hsl(var(--warning-soft))] ring-1 ring-[hsl(var(--warning)/0.25)]"
											: "bg-[hsl(var(--primary)/0.07)] ring-1 ring-[hsl(var(--primary)/0.12)]"
									}`}
								>
									<Icon
										className={`h-4 w-4 ${urgent ? "text-[hsl(var(--warning-foreground))]" : "text-primary"}`}
										strokeWidth={1.6}
									/>
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-[13.5px] font-medium text-foreground">
										{label}
									</p>
								</div>
								<p
									className={`text-[20px] font-normal arabic-nums tabular-nums leading-none ${
										urgent ? "text-[hsl(var(--warning-foreground))]" : "text-foreground"
									}`}
								>
									{formatArNumber(value)}
								</p>
								<ArrowLeft
									className="h-3.5 w-3.5 text-[hsl(var(--foreground-subtle))] group-hover:text-primary group-hover:-translate-x-0.5 transition-all shrink-0"
									strokeWidth={1.6}
								/>
							</Link>
						)
					})}
				</div>
			</section>

			{/* Recent posts — ornament-divider header, semantic Badge for status. */}
			<section className="bg-white rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-soft">
				<div className="px-5 py-4 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="h-5 w-0.5 rounded-full bg-linear-to-b from-primary to-[hsl(var(--primary)/0.4)]" />
						<h2 className="text-[15px] font-semibold text-foreground">
							آخر المقالات
						</h2>
					</div>
					<Link
						href="/dashboard/posts"
						className="text-xs font-medium text-primary hover:underline flex items-center gap-1 hover:gap-1.5 transition-all"
					>
						عرض الكل
						<ArrowLeft className="h-3 w-3" strokeWidth={1.6} />
					</Link>
				</div>
				<div className="divider-brand" />
				{recentPosts.length === 0 ? (
					<EmptyState
						icon={FileText}
						title="لا توجد مقالات بعد"
						description="ابدأ بإنشاء مقالتك الأولى لتظهر هنا."
						action={
							<Link
								href="/dashboard/posts/new"
								className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-[hsl(var(--primary)/0.92)] shadow-soft hover:shadow-raise transition-all"
							>
								<Plus className="h-4 w-4" strokeWidth={1.6} />مقالة جديدة
							</Link>
						}
					/>
				) : (
					<div className="divide-y divide-[hsl(var(--border))]">
						{recentPosts.map((p) => {
							const thumb = p.cover_image_id ? recentThumbs[p.cover_image_id] : null
							return (
								<Link
									key={p.id}
									href={`/dashboard/posts/${p.id}`}
									className="group flex items-center gap-4 px-5 py-3.5 hover:bg-surface-muted transition-colors"
								>
									<div className="w-12 h-12 rounded-md bg-surface-muted overflow-hidden shrink-0 ring-1 ring-[hsl(var(--border))]">
										{thumb ? (
											<img src={thumb} alt="" className="w-full h-full object-cover" />
										) : (
											<div className="w-full h-full flex items-center justify-center">
												<FileText className="h-4 w-4 text-[hsl(var(--foreground-subtle))]" strokeWidth={1.6} />
											</div>
										)}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-[13.5px] font-medium text-foreground truncate group-hover:text-primary transition-colors">
											{titleOf(p)}
										</p>
										<div className="mt-1 flex items-center gap-2 flex-wrap text-[11.5px] text-[hsl(var(--foreground-muted))]">
											<Badge
												variant={p.is_published ? "success" : "default"}
												dot
											>
												{p.is_published ? "منشور" : "مسودة"}
											</Badge>
											<span className="inline-flex items-center gap-1 arabic-nums tabular-nums">
												<Eye className="h-3 w-3" strokeWidth={1.6} />
												{formatArNumber(p.views ?? 0)}
											</span>
											{p.translation?.reading_time_minutes ? (
												<>
													<span className="text-[hsl(var(--foreground-subtle))]">·</span>
													<span className="arabic-nums">
														{toArabicDigits(p.translation.reading_time_minutes)} د قراءة
													</span>
												</>
											) : null}
											<span className="text-[hsl(var(--foreground-subtle))]">·</span>
											<span className="arabic-nums tabular-nums">
												{toArabicDigits(safeFormat(p.created_at, "dd/MM/yyyy"))}
											</span>
										</div>
									</div>
									<ArrowLeft
										className="h-3.5 w-3.5 text-[hsl(var(--foreground-subtle))] group-hover:text-primary group-hover:-translate-x-0.5 transition-all shrink-0"
										strokeWidth={1.6}
									/>
								</Link>
							)
						})}
					</div>
				)}
			</section>
		</div>
	)
}
