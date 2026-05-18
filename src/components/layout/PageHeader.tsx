import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import type { LucideIcon } from "lucide-react"

type Crumb = { label: string; href?: string }

type Props = {
	title: string
	description?: string
	icon?: LucideIcon
	breadcrumbs?: Crumb[]
	actions?: React.ReactNode
	stats?: React.ReactNode
	className?: string
}

export default function PageHeader({
	title,
	description,
	icon: Icon,
	breadcrumbs,
	actions,
	stats,
	className = "",
}: Props) {
	return (
		<div className={`bg-white rounded-xl border border-gray-200 px-6 py-5 ${className}`}>
			{breadcrumbs && breadcrumbs.length > 0 && (
				<nav className="flex items-center gap-1 text-xs text-gray-500 mb-3" aria-label="مسار التنقل">
					{breadcrumbs.map((c, i) => (
						<span key={i} className="flex items-center gap-1">
							{c.href ? (
								<Link href={c.href} className="hover:text-primary transition-colors">
									{c.label}
								</Link>
							) : (
								<span>{c.label}</span>
							)}
							{i < breadcrumbs.length - 1 && (
								<ChevronLeft className="h-3 w-3 text-gray-300" />
							)}
						</span>
					))}
				</nav>
			)}

			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex items-start gap-3 min-w-0">
					{Icon && (
						<div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
							<Icon className="h-5 w-5 text-primary" />
						</div>
					)}
					<div className="min-w-0">
						<h1 className="text-xl font-bold text-gray-900 truncate">{title}</h1>
						{description && (
							<p className="mt-0.5 text-sm text-gray-500">{description}</p>
						)}
					</div>
				</div>

				{actions && (
					<div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>
				)}
			</div>

			{stats && (
				<div className="mt-4 pt-4 border-t border-gray-100">{stats}</div>
			)}
		</div>
	)
}
