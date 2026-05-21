import { ButtonHTMLAttributes, forwardRef } from "react"

type Tone = "neutral" | "primary" | "danger"
type Size = "sm" | "md"

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	/** Visible-on-hover label — required for screen readers. */
	label: string
	/** A Lucide icon JSX element. Rendered at 14–16px with stroke 1.6 by default. */
	icon: React.ReactNode
	tone?: Tone
	size?: Size
}

/**
 * IconButton — the canonical inline action button used in table rows, list
 * meta rows, and toolbars. Replaces the dozens of ad-hoc patterns like:
 *
 *   <button className="p-1 text-gray-400 hover:text-primary"><Edit className="h-3.5 w-3.5"/></button>
 *
 * Touch target is at least 28×28 (size="sm") or 32×32 (size="md") so it
 * passes the WCAG 2.5.5 minimum.
 *
 * The aria-label is mandatory because the button has no visible text.
 */
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
	(
		{
			label,
			icon,
			tone = "neutral",
			size = "sm",
			className = "",
			type = "button",
			...rest
		},
		ref,
	) => {
		const sizeStyles: Record<Size, string> = {
			sm: "p-1.5", // 28×28 with a 16px icon
			md: "p-2",   // 32×32 with a 16px icon
		}

		const toneStyles: Record<Tone, string> = {
			neutral:
				"text-[hsl(var(--foreground-muted))] hover:text-primary hover:bg-[hsl(var(--primary)/0.08)]",
			primary:
				"text-primary hover:bg-[hsl(var(--primary)/0.08)]",
			danger:
				"text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-soft))]",
		}

		return (
			<button
				ref={ref}
				type={type}
				aria-label={label}
				title={label}
				className={`cursor-pointer inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40 disabled:cursor-not-allowed ${toneStyles[tone]} ${sizeStyles[size]} ${className}`}
				{...rest}
			>
				{icon}
			</button>
		)
	},
)

IconButton.displayName = "IconButton"

export default IconButton
