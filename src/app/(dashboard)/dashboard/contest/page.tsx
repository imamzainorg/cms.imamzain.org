"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import Pagination from "@/components/ui/Pagination"
import EmptyState from "@/components/ui/EmptyState"
import PageHeader from "@/components/layout/PageHeader"
import { ListSkeleton } from "@/components/ui/Skeleton"
import { Trophy, Search, CheckCircle2, Clock, Award, Medal, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { safeFormat } from "@/lib/dates"
import {
	useContestAttemptsList,
	useContestAttemptsCount,
} from "@/lib/queries/contest"

type SortKey = "rank" | "name" | "date"
type SortDir = "asc" | "desc"

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
	if (!active) return <ArrowUpDown className="h-3 w-3 opacity-40" />
	return dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
}

export default function ContestPage() {
	const [page, setPage] = useState(1)
	const [limit, setLimit] = useState(30)
	const [filter, setFilter] = useState<"" | "true" | "false">("")
	const [search, setSearch] = useState("")
	const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "rank", dir: "asc" })

	const onFilterChange = (f: typeof filter) => { setFilter(f); setPage(1) }
	const onLimitChange = (n: number) => { setLimit(n); setPage(1) }

	const allCount = useContestAttemptsCount({})
	const submittedCount = useContestAttemptsCount({ submitted: "true" })
	const progressCount = useContestAttemptsCount({ submitted: "false" })
	const counts = {
		all: allCount.data ?? 0,
		submitted: submittedCount.data ?? 0,
		inProgress: progressCount.data ?? 0,
	}

	const listQuery = useContestAttemptsList({ page, limit, submitted: filter || undefined })
	const attempts = listQuery.data?.items ?? []
	const total = listQuery.data?.pagination?.total ?? 0
	const pages = listQuery.data?.pagination?.pages ?? 1
	const loading = listQuery.isLoading

	useEffect(() => {
		if (listQuery.error) toast.error(getErrorMessage(listQuery.error, "فشل تحميل المحاولات"))
	}, [listQuery.error])

	const filtered = attempts.filter((a) =>
		!search ||
		a.full_name.toLowerCase().includes(search.toLowerCase()) ||
		(a.phone && a.phone.includes(search))
	)

	const submittedScores = filtered.filter((a) => a.is_submitted).map((a) => a.score ?? 0)
	const avgScore = submittedScores.length
		? (submittedScores.reduce((s, n) => s + n, 0) / submittedScores.length).toFixed(1)
		: "—"
	const maxScore = submittedScores.length ? Math.max(...submittedScores) : 0

	const ranked = useMemo(() => {
		const submittedSorted = [...filtered]
			.filter((a) => a.is_submitted)
			.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
		const rankByScore = new Map<number, number>()
		let lastScore = -1
		let lastRank = 0
		submittedSorted.forEach((a, i) => {
			const s = a.score ?? 0
			if (s !== lastScore) {
				lastRank = i + 1
				lastScore = s
			}
			rankByScore.set(s, Math.min(rankByScore.get(s) ?? Infinity, lastRank))
		})

		const withRank = filtered.map((a) => ({
			attempt: a,
			rank: a.is_submitted ? rankByScore.get(a.score ?? 0) ?? null : null,
		}))

		return [...withRank].sort((a, b) => {
			const dir = sort.dir === "asc" ? 1 : -1
			if (sort.key === "rank") {
				if (a.rank == null && b.rank == null) return 0
				if (a.rank == null) return 1
				if (b.rank == null) return -1
				return (a.rank - b.rank) * dir
			}
			if (sort.key === "name") {
				return a.attempt.full_name.localeCompare(b.attempt.full_name, "ar") * dir
			}
			const aDate = a.attempt.created_at ? new Date(a.attempt.created_at).getTime() : 0
			const bDate = b.attempt.created_at ? new Date(b.attempt.created_at).getTime() : 0
			return (aDate - bDate) * dir
		})
	}, [filtered, sort])

	const setSortBy = (key: SortKey) => {
		setSort((prev) => ({
			key,
			dir: prev.key === key ? (prev.dir === "asc" ? "desc" : "asc") : key === "rank" ? "asc" : "desc",
		}))
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="مسابقة قطوف من الصحيفة السجادية"
				description="ترتيب المتسابقين حسب الدرجة. الأعلى يظهر أوّلاً."
				icon={Trophy}
			/>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				{[
					{ label: "إجمالي المحاولات", value: counts.all, icon: Trophy, color: "text-amber-600", bg: "bg-amber-50" },
					{ label: "مُسلَّمة", value: counts.submitted, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
					{ label: "قيد التقدم", value: counts.inProgress, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
					{ label: "متوسط الدرجة", value: avgScore, icon: Award, color: "text-secondary", bg: "bg-secondary/10" },
				].map(({ label, value, icon: Icon, color, bg }) => (
					<div key={label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
						<div className={`p-2.5 rounded-lg ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
						<div>
							<p className="text-xs text-gray-500">{label}</p>
							<p className="text-xl font-bold text-gray-900">{value}</p>
						</div>
					</div>
				))}
			</div>

			<div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
				<div className="relative flex-1 min-w-50">
					<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
					<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو رقم الهاتف..." className="w-full pr-9 pl-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
				</div>
				<div className="flex gap-1 bg-gray-100 rounded-md p-1">
					{([["", "الكل"], ["true", "مُسلَّمة"], ["false", "قيد التقدم"]] as const).map(([k, l]) => (
						<button key={k} onClick={() => onFilterChange(k)}
							className={`cursor-pointer px-3 py-1 text-xs font-medium rounded transition-colors ${filter === k ? "bg-white text-primary shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
							{l}
						</button>
					))}
				</div>
			</div>

			{loading ? (
				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<ListSkeleton rows={6} />
				</div>
			) : ranked.length === 0 ? (
				<EmptyState
					variant="card"
					icon={Trophy}
					title={search ? "لا توجد نتائج" : "لا توجد محاولات بعد"}
					description={search ? "جرّب اسماً أو رقماً مختلفاً." : "ستظهر هنا محاولات المتسابقين بمجرّد بدء المسابقة."}
				/>
			) : (
				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-20">
									<button onClick={() => setSortBy("rank")} className="cursor-pointer inline-flex items-center gap-1 hover:text-primary">
										الترتيب <SortIcon active={sort.key === "rank"} dir={sort.dir} />
									</button>
								</th>
								<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
									<button onClick={() => setSortBy("name")} className="cursor-pointer inline-flex items-center gap-1 hover:text-primary">
										المتسابق <SortIcon active={sort.key === "name"} dir={sort.dir} />
									</button>
								</th>
								<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الهاتف</th>
								<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الدرجة</th>
								<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
								<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
									<button onClick={() => setSortBy("date")} className="cursor-pointer inline-flex items-center gap-1 hover:text-primary">
										التاريخ <SortIcon active={sort.key === "date"} dir={sort.dir} />
									</button>
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-100">
							{ranked.map(({ attempt: a, rank }) => {
								const isTop = rank != null && rank <= 3
								const isWinner = rank === 1 && (a.score ?? 0) === maxScore
								return (
									<tr key={a.id} className={`hover:bg-gray-50 ${isWinner ? "bg-amber-50/40" : ""}`}>
										<td className="px-4 py-3">
											{rank == null ? (
												<span className="text-xs text-gray-400">—</span>
											) : isTop ? (
												<span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-linear-to-br from-amber-400 to-amber-600 text-white shadow-sm" title={`المرتبة ${rank}`}>
													<Medal className="h-4 w-4" />
												</span>
											) : (
												<span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
													{rank}
												</span>
											)}
										</td>
										<td className="px-4 py-3">
											<span className="text-sm font-medium text-gray-900">{a.full_name}</span>
										</td>
										<td className="px-4 py-3 text-sm text-gray-500" dir="ltr">{a.phone || "—"}</td>
										<td className="px-4 py-3">
											{a.is_submitted ? (
												<span className={`inline-flex items-center gap-1 px-2.5 py-1 text-sm font-bold rounded-md ${isWinner ? "bg-amber-100 text-amber-800" : "bg-primary/10 text-primary"}`}>
													{a.score ?? 0}
												</span>
											) : (
												<span className="text-sm text-gray-400">—</span>
											)}
										</td>
										<td className="px-4 py-3">
											<span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${a.is_submitted ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
												{a.is_submitted ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
												{a.is_submitted ? "مُسلَّمة" : "قيد التقدم"}
											</span>
										</td>
										<td className="px-4 py-3 text-sm text-gray-500">{safeFormat(a.created_at, "dd/MM/yyyy HH:mm")}</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			)}

			<Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} onLimit={onLimitChange} pageSizes={[30, 50, 100]} />
		</div>
	)
}
