"use client"

import { useQueries } from "@tanstack/react-query"
import { useAuthStore } from "@/store/auth"
import type { Post } from "@/types"
import {
	BookOpen, FileText, Mail, Users, GraduationCap, Image as ImageIcon, Newspaper, ArrowLeft, Eye, Plus, TrendingUp, Clock,
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import EmptyState from "@/components/ui/EmptyState"
import { StatGridSkeleton, Skeleton, ListSkeleton } from "@/components/ui/Skeleton"
import { useDashboardStats } from "@/lib/queries/dashboard"
import { usePostsList } from "@/lib/queries/posts"
import { mediaService } from "@/services/media.service"
import { queryKeys } from "@/lib/queries/keys"

export default function DashboardPage() {
	const { user } = useAuthStore()

	// One round-trip for all the headline counts (replaces 8 parallel queries).
	const statsQuery = useDashboardStats()
	const stats = statsQuery.data

	// Latest 5 posts for the recent-posts panel
	const recentPostsQuery = usePostsList({ limit: 5 })
	const recentPosts: Post[] = recentPostsQuery.data?.items ?? []

	// Fetch each unique cover thumbnail in parallel; Query dedupes by media.detail(id)
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
				<div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-2 shadow-soft">
					<Skeleton className="h-6 w-1/3" />
					<Skeleton className="h-4 w-2/3" />
				</div>
				<StatGridSkeleton count={4} />
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-soft">
						<div className="px-5 py-4 border-b border-gray-100"><Skeleton className="h-4 w-1/4" /></div>
						<ListSkeleton rows={5} />
					</div>
					<div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 shadow-soft">
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

	const contentCards = [
		{ label: "المقالات", value: stats?.posts.total ?? 0, icon: FileText, href: "/dashboard/posts", iconBg: "bg-blue-50", iconColor: "text-blue-600", accent: "from-blue-500/10" },
		{ label: "الكتب", value: stats?.library.books ?? 0, icon: BookOpen, href: "/dashboard/books", iconBg: "bg-emerald-50", iconColor: "text-emerald-600", accent: "from-emerald-500/10" },
		{ label: "الأبحاث", value: stats?.library.academic_papers ?? 0, icon: GraduationCap, href: "/dashboard/papers", iconBg: "bg-purple-50", iconColor: "text-purple-600", accent: "from-purple-500/10" },
		{ label: "صور المعرض", value: stats?.library.gallery_images ?? 0, icon: ImageIcon, href: "/dashboard/gallery", iconBg: "bg-pink-50", iconColor: "text-pink-600", accent: "from-pink-500/10" },
	]

	const actionCards = [
		{ label: "رسائل جديدة", value: stats?.forms.contact_new ?? 0, icon: Mail, href: "/dashboard/contacts", iconBg: "bg-amber-50", iconColor: "text-amber-600", urgent: (stats?.forms.contact_new ?? 0) > 0 },
		{ label: "طلبات قيد الانتظار", value: stats?.forms.proxy_visit_pending ?? 0, icon: Users, href: "/dashboard/proxy-visits", iconBg: "bg-orange-50", iconColor: "text-orange-600", urgent: (stats?.forms.proxy_visit_pending ?? 0) > 0 },
		{ label: "مشتركو النشرة", value: stats?.newsletter.active_subscribers ?? 0, icon: Newspaper, href: "/dashboard/newsletter", iconBg: "bg-teal-50", iconColor: "text-teal-600" },
	]

	const postsBreakdown = stats?.posts
	const formattedNum = (n: number) => n.toLocaleString("ar-EG")

	return (
		<div className="space-y-6">
			{/* Hero greeting */}
			<div className="relative overflow-hidden rounded-2xl bg-linear-to-bl from-primary via-[hsl(169_85%_18%)] to-[hsl(169_100%_14%)] text-white shadow-raise">
				{/* Decorative blurred orbs */}
				<div className="pointer-events-none absolute -top-20 -end-20 h-64 w-64 rounded-full bg-secondary/30 blur-3xl" />
				<div className="pointer-events-none absolute -bottom-24 -start-16 h-72 w-72 rounded-full bg-primary-foreground/10 blur-3xl" />
				<div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{
					backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 30%, white 1px, transparent 1px)`,
					backgroundSize: "32px 32px",
				}} />
				<div className="relative p-6 sm:p-8">
					<p className="text-xs font-medium text-secondary/90 mb-2 tracking-wide">لوحة التحكم</p>
					<h1 className="text-2xl sm:text-3xl font-bold mb-2 leading-tight">{greeting}، {user?.username}</h1>
					<p className="text-white/75 text-sm max-w-2xl leading-relaxed">
						إليك ملخّصاً لمحتوى الموقع وآخر التفاعلات.
						{postsBreakdown && (
							<> نُشر <strong className="text-white font-semibold">{formattedNum(postsBreakdown.published)}</strong> مقالة من أصل <strong className="text-white font-semibold">{formattedNum(postsBreakdown.total)}</strong> <span className="text-white/60">({formattedNum(postsBreakdown.drafts)} مسوّدة)</span>.</>
						)}
					</p>
					<div className="mt-6 flex flex-wrap gap-2">
						<Link href="/dashboard/posts/new" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-primary text-sm font-semibold rounded-lg hover:bg-white/95 hover:shadow-lg hover:-translate-y-px transition-all shadow-md">
							<Plus className="h-4 w-4" />مقالة جديدة
						</Link>
						<Link href="/dashboard/books/new" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-colors">
							<Plus className="h-4 w-4" />كتاب جديد
						</Link>
						<Link href="/dashboard/papers/new" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-colors">
							<Plus className="h-4 w-4" />بحث جديد
						</Link>
						<Link href="/dashboard/gallery" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-colors">
							<ImageIcon className="h-4 w-4" />رفع صور
						</Link>
					</div>
				</div>
			</div>

			{/* Content stat cards */}
			<div>
				<div className="flex items-center justify-between mb-3">
					<h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.08em]">المحتوى</h2>
					<div className="flex-1 mx-3 divider-brand" />
					<TrendingUp className="h-3.5 w-3.5 text-gray-400" />
				</div>
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
					{contentCards.map(({ label, value, icon: Icon, href, iconBg, iconColor, accent }) => (
						<Link key={label} href={href} className="group">
							<div className="relative bg-white rounded-2xl border border-gray-200 p-5 hover:border-primary/30 shadow-soft hover:shadow-raise transition-all duration-200 h-full overflow-hidden">
								<div className={`pointer-events-none absolute -top-12 -end-12 h-32 w-32 rounded-full bg-linear-to-br ${accent} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
								<div className="relative">
									<div className="flex items-start justify-between mb-4">
										<div className={`p-2.5 rounded-xl ${iconBg} ring-1 ring-inset ring-black/[0.04]`}>
											<Icon className={`h-5 w-5 ${iconColor}`} />
										</div>
										<ArrowLeft className="h-4 w-4 text-gray-300 group-hover:text-primary group-hover:-translate-x-0.5 transition-all" />
									</div>
									<p className="text-3xl font-bold text-gray-900 tabular-nums">{formattedNum(value)}</p>
									<p className="text-sm text-gray-500 mt-1">{label}</p>
								</div>
							</div>
						</Link>
					))}
				</div>
			</div>

			{/* Action cards */}
			<div>
				<div className="flex items-center justify-between mb-3">
					<h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.08em]">يحتاج إلى انتباهك</h2>
					<div className="flex-1 mx-3 divider-brand" />
					<Clock className="h-3.5 w-3.5 text-gray-400" />
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{actionCards.map(({ label, value, icon: Icon, href, iconBg, iconColor, urgent }) => (
						<Link key={label} href={href} className="group">
							<div className={`relative overflow-hidden bg-white rounded-2xl border ${urgent ? "border-amber-300 ring-1 ring-amber-200/60" : "border-gray-200"} p-5 hover:border-primary/30 shadow-soft hover:shadow-raise transition-all duration-200 flex items-center gap-4`}>
								{urgent && (
									<div className="pointer-events-none absolute top-0 start-0 end-0 h-0.5 bg-linear-to-l from-amber-400 via-amber-300 to-amber-400" />
								)}
								<div className={`p-3 rounded-xl ${iconBg} ring-1 ring-inset ring-black/[0.04] ${urgent ? "animate-pulse" : ""}`}>
									<Icon className={`h-6 w-6 ${iconColor}`} />
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-2xl font-bold text-gray-900 tabular-nums">{formattedNum(value)}</p>
									<p className="text-sm text-gray-500 truncate">{label}</p>
								</div>
								<ArrowLeft className="h-4 w-4 text-gray-300 group-hover:text-primary group-hover:-translate-x-0.5 transition-all" />
							</div>
						</Link>
					))}
				</div>
			</div>

			{/* Recent posts */}
			<div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-soft">
				<div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="h-7 w-1 rounded-full bg-linear-to-b from-primary to-primary/40" />
						<h2 className="text-base font-semibold text-gray-900">آخر المقالات</h2>
					</div>
					<Link href="/dashboard/posts" className="text-xs font-medium text-primary hover:underline flex items-center gap-1 hover:gap-1.5 transition-all">
						عرض الكل<ArrowLeft className="h-3 w-3" />
					</Link>
				</div>
				{recentPosts.length === 0 ? (
					<EmptyState
						icon={FileText}
						title="لا توجد مقالات بعد"
						description="ابدأ بإنشاء مقالتك الأولى لتظهر هنا."
						action={(
							<Link href="/dashboard/posts/new" className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 shadow-soft hover:shadow-raise transition-all">
								<Plus className="h-4 w-4" />مقالة جديدة
							</Link>
						)}
					/>
				) : (
					<div className="divide-y divide-gray-100">
						{recentPosts.map((p) => {
							const thumb = p.cover_image_id ? recentThumbs[p.cover_image_id] : null
							return (
								<Link key={p.id} href={`/dashboard/posts/${p.id}`} className="group flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/80 transition-colors">
									<div className="w-14 h-14 rounded-xl bg-linear-to-br from-gray-100 to-gray-200 overflow-hidden shrink-0 ring-1 ring-black/[0.04]">
										{thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FileText className="h-5 w-5 text-gray-300" /></div>}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary transition-colors">{titleOf(p)}</p>
										<p className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
											<span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] ring-1 ring-inset ${p.is_published ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-gray-100 text-gray-600 ring-gray-200"}`}>
												<span className={`h-1.5 w-1.5 rounded-full ${p.is_published ? "bg-emerald-500" : "bg-gray-400"}`} />
												{p.is_published ? "منشور" : "مسودة"}
											</span>
											<span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formattedNum(p.views ?? 0)}</span>
											{p.translation?.reading_time_minutes ? (
												<>
													<span className="text-gray-300">·</span>
													<span>{p.translation.reading_time_minutes} د قراءة</span>
												</>
											) : null}
											<span className="text-gray-300">·</span>
											<span>{p.created_at ? format(new Date(p.created_at), "dd/MM/yyyy") : ""}</span>
										</p>
									</div>
									<ArrowLeft className="h-4 w-4 text-gray-300 group-hover:text-primary group-hover:-translate-x-0.5 transition-all shrink-0" />
								</Link>
							)
						})}
					</div>
				)}
			</div>
		</div>
	)
}
