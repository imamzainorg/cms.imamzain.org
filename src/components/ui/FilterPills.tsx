"use client"

type Option<T extends string> = {
	value: T
	label: string
}

type Props<T extends string> = {
	value: T
	options: ReadonlyArray<Option<T>>
	onChange: (value: T) => void
	/**
	 * Default "tabs" variant uses an outer card with a colored active state
	 * suitable for primary filters (posts status, proxy-visits status,
	 * campaign status). "segmented" uses a tighter inline pill group used by
	 * newsletter and contest where the pills sit alongside other controls.
	 */
	variant?: "tabs" | "segmented"
	className?: string
}

/**
 * Standard horizontal pill-group filter — used by every list page that
 * exposes a discrete status selector (posts draft/scheduled/published,
 * campaigns 7-state, newsletter all/active/inactive, proxy-visits, contest).
 */
export default function FilterPills<T extends string>({
	value,
	options,
	onChange,
	variant = "tabs",
	className = "",
}: Props<T>) {
	if (variant === "segmented") {
		return (
			<div className={`flex gap-1 bg-gray-100 rounded-md p-1 ${className}`}>
				{options.map((o) => {
					const active = value === o.value
					return (
						<button
							key={o.value}
							type="button"
							onClick={() => onChange(o.value)}
							className={`cursor-pointer px-3 py-1 text-xs font-medium rounded transition-colors ${
								active ? "bg-white text-primary shadow-sm" : "text-gray-600 hover:text-gray-900"
							}`}
						>
							{o.label}
						</button>
					)
				})}
			</div>
		)
	}
	return (
		<div className={`flex gap-1 ${className}`}>
			{options.map((o) => {
				const active = value === o.value
				return (
					<button
						key={o.value}
						type="button"
						onClick={() => onChange(o.value)}
						className={`cursor-pointer px-4 py-2 text-sm font-medium rounded-md transition-colors ${
							active
								? "bg-primary text-white"
								: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
						}`}
					>
						{o.label}
					</button>
				)
			})}
		</div>
	)
}
