"use client"

type Props<T> = {
	categories: T[]
	value: string
	onChange: (id: string) => void
	getName: (c: T) => string
	getId?: (c: T) => string
	className?: string
	placeholder?: string
}

/**
 * Standard "كل التصنيفات" filter dropdown used by posts/books/papers list
 * pages. The accessor pair lets each resource hand in its own translations
 * shape without leaking the type union into this component.
 */
export default function CategoryFilterSelect<T>({
	categories,
	value,
	onChange,
	getName,
	getId = (c) => (c as { id: string }).id,
	className = "",
	placeholder = "كل التصنيفات",
}: Props<T>) {
	return (
		<select
			value={value}
			onChange={(e) => onChange(e.target.value)}
			className={`cursor-pointer px-3 py-1.5 text-sm bg-white border border-[hsl(var(--border))] rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${className}`}
		>
			<option value="">{placeholder}</option>
			{categories.map((c) => (
				<option key={getId(c)} value={getId(c)}>
					{getName(c)}
				</option>
			))}
		</select>
	)
}
