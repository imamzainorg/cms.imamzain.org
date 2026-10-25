"use client"

import {
	Children, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
	type ReactElement, type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form"
import { Check, ChevronDown, Search } from "lucide-react"

type Opt = { value: string; label: string; disabled: boolean }
type Group = { label: string | null; options: Opt[] }

function textOf(node: ReactNode): string {
	if (node == null || typeof node === "boolean") return ""
	if (typeof node === "string" || typeof node === "number") return String(node)
	if (Array.isArray(node)) return node.map(textOf).join("")
	if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children)
	return ""
}

type OptionProps = { value?: string | number; disabled?: boolean; children?: ReactNode }
type GroupProps = { label?: string; children?: ReactNode }

/** Reads `<option>` / `<optgroup>` children so call sites keep the native-select markup. */
function parseGroups(children: ReactNode): Group[] {
	const groups: Group[] = []
	let loose: Opt[] = []
	const toOpt = (el: ReactElement<OptionProps>): Opt => ({
		value: String(el.props.value ?? textOf(el.props.children)),
		label: textOf(el.props.children),
		disabled: !!el.props.disabled,
	})
	for (const child of Children.toArray(children)) {
		if (!isValidElement(child)) continue
		if (child.type === "option") {
			loose.push(toOpt(child as ReactElement<OptionProps>))
		} else if (child.type === "optgroup") {
			if (loose.length) { groups.push({ label: null, options: loose }); loose = [] }
			const gp = child as ReactElement<GroupProps>
			const options = Children.toArray(gp.props.children)
				.filter((c): c is ReactElement<OptionProps> => isValidElement(c) && c.type === "option")
				.map(toOpt)
			groups.push({ label: gp.props.label ?? "", options })
		}
	}
	if (loose.length) groups.push({ label: null, options: loose })
	return groups
}

export type SelectChange = { target: { value: string }; currentTarget: { value: string } }

type Props = {
	value: string | number | undefined | null
	onChange?: (e: SelectChange) => void
	onBlur?: () => void
	children?: ReactNode
	className?: string
	disabled?: boolean
	required?: boolean
	id?: string
	name?: string
	"aria-label"?: string
	/** Show a search box once there are at least this many options (default 10). */
	searchableFrom?: number
}

/**
 * Drop-in replacement for a native <select> (same <option>/<optgroup> children,
 * same `value` / `onChange(e.target.value)` shape) with a styled, keyboard-friendly
 * menu rendered in a portal so modals and overflow containers never clip it.
 */
export default function Select({
	value, onChange, onBlur, children, className = "", disabled, required, id, name,
	"aria-label": ariaLabel, searchableFrom = 10,
}: Props) {
	const groups = useMemo(() => parseGroups(children), [children])
	const flat = useMemo(() => groups.flatMap((g) => g.options), [groups])
	const current = value == null ? "" : String(value)
	const selected = flat.find((o) => o.value === current)
	const searchable = flat.length >= searchableFrom

	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState("")
	const [active, setActive] = useState(-1)
	const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number } | null>(null)
	const btnRef = useRef<HTMLButtonElement>(null)
	const menuRef = useRef<HTMLDivElement>(null)
	const searchRef = useRef<HTMLInputElement>(null)
	const listId = useId()

	const q = query.trim().toLowerCase()
	const visible = useMemo(
		() => groups
			.map((g) => ({ ...g, options: q ? g.options.filter((o) => o.label.toLowerCase().includes(q)) : g.options }))
			.filter((g) => g.options.length > 0),
		[groups, q],
	)
	const visibleFlat = useMemo(() => visible.flatMap((g) => g.options), [visible])

	const place = useCallback(() => {
		const r = btnRef.current?.getBoundingClientRect()
		if (!r) return
		const gap = 6
		const below = window.innerHeight - r.bottom - gap - 8
		const above = r.top - gap - 8
		const flip = below < 200 && above > below
		const maxH = Math.max(140, Math.min(320, flip ? above : below))
		setPos(flip
			? { left: r.left, width: r.width, bottom: window.innerHeight - r.top + gap, maxH }
			: { left: r.left, width: r.width, top: r.bottom + gap, maxH })
	}, [])

	const close = useCallback(() => { setOpen(false); setQuery("") }, [])

	const choose = (o: Opt) => {
		if (o.disabled) return
		onChange?.({ target: { value: o.value }, currentTarget: { value: o.value } })
		close()
		btnRef.current?.focus()
	}

	useLayoutEffect(() => { if (open) place() }, [open, place, visibleFlat.length])

	useEffect(() => {
		if (!open) return
		const idx = visibleFlat.findIndex((o) => o.value === current)
		setActive(idx >= 0 ? idx : visibleFlat.findIndex((o) => !o.disabled))
		const onDown = (e: MouseEvent) => {
			const t = e.target as Node
			if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return
			close()
		}
		const onScroll = (e: Event) => { if (!menuRef.current?.contains(e.target as Node)) place() }
		document.addEventListener("mousedown", onDown)
		window.addEventListener("resize", place)
		window.addEventListener("scroll", onScroll, true)
		if (searchable) searchRef.current?.focus()
		return () => {
			document.removeEventListener("mousedown", onDown)
			window.removeEventListener("resize", place)
			window.removeEventListener("scroll", onScroll, true)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open])

	useEffect(() => {
		if (!open || active < 0) return
		menuRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView?.({ block: "nearest" })
	}, [active, open])

	const move = (dir: 1 | -1) => {
		if (!visibleFlat.length) return
		let i = active
		for (let n = 0; n < visibleFlat.length; n++) {
			i = (i + dir + visibleFlat.length) % visibleFlat.length
			if (!visibleFlat[i].disabled) { setActive(i); return }
		}
	}

	const onKeyDown = (e: React.KeyboardEvent) => {
		if (!open) {
			if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); setOpen(true) }
			return
		}
		if (e.key === "Escape") { e.preventDefault(); close(); btnRef.current?.focus() }
		else if (e.key === "ArrowDown") { e.preventDefault(); move(1) }
		else if (e.key === "ArrowUp") { e.preventDefault(); move(-1) }
		else if (e.key === "Enter") { e.preventDefault(); if (visibleFlat[active]) choose(visibleFlat[active]) }
		else if (e.key === "Tab") close()
	}

	let idx = -1
	return (
		<>
			<button
				ref={btnRef}
				type="button"
				id={id}
				name={name}
				role="combobox"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={open ? listId : undefined}
				aria-label={ariaLabel}
				disabled={disabled}
				onClick={() => (open ? close() : setOpen(true))}
				onKeyDown={onKeyDown}
				onBlur={onBlur}
				className={`cursor-pointer flex items-center justify-between gap-3 text-start bg-white outline-none transition-colors hover:border-gray-400 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary disabled:opacity-50 disabled:cursor-not-allowed ${open ? "ring-2 ring-primary/30 border-primary" : ""} ${className}`}
			>
				<span className={`truncate ${selected && selected.value !== "" ? "" : "text-gray-500"}`}>
					{selected ? selected.label : " "}
				</span>
				<ChevronDown className={`h-4 w-4 shrink-0 mx-0.5 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.8} />
			</button>
			{required && (
				// Keeps native "required" validation working for the custom control.
				<input tabIndex={-1} aria-hidden required value={current} onChange={() => {}}
					className="absolute w-px h-px opacity-0 pointer-events-none" />
			)}
			{open && pos && createPortal(
				<div
					ref={menuRef}
					id={listId}
					role="listbox"
					dir="rtl"
					style={{ position: "fixed", left: pos.left, width: Math.max(pos.width, 160), top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH, zIndex: 100 }}
					className="flex flex-col bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
				>
					{searchable && (
						<div className="relative p-2 border-b border-gray-100 shrink-0">
							<Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<input
								ref={searchRef}
								value={query}
								onChange={(e) => { setQuery(e.target.value); setActive(0) }}
								onKeyDown={onKeyDown}
								placeholder="بحث..."
								className="w-full pr-8 pl-3 py-1.5 text-sm border border-gray-200 rounded-md outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
							/>
						</div>
					)}
					<div className="overflow-y-auto py-1">
						{visibleFlat.length === 0 && <p className="px-3 py-3 text-sm text-gray-500 text-center">لا توجد نتائج</p>}
						{visible.map((g, gi) => (
							<div key={gi}>
								{g.label && <p className="px-3 pt-2 pb-1 text-[11px] font-semibold text-gray-400">{g.label}</p>}
								{g.options.map((o) => {
									idx++
									const i = idx
									const isSel = o.value === current
									return (
										<div
											key={o.value + ":" + i}
											role="option"
											aria-selected={isSel}
											aria-disabled={o.disabled}
											data-idx={i}
											onMouseEnter={() => !o.disabled && setActive(i)}
											onClick={() => choose(o)}
											className={`mx-1 flex items-center justify-between gap-3 px-3 py-2 text-sm rounded-lg ${o.disabled ? "text-gray-300 cursor-not-allowed" : "cursor-pointer"} ${i === active && !o.disabled ? "bg-primary/10 text-gray-900" : "text-gray-700"} ${isSel ? "font-medium text-primary" : ""}`}
										>
											<span className="truncate">{o.label || " "}</span>
											{isSel && <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />}
										</div>
									)
								})}
							</div>
						))}
					</div>
				</div>,
				document.body,
			)}
		</>
	)
}

type FormSelectProps<T extends FieldValues> = Omit<Props, "value" | "onChange" | "onBlur" | "name"> & {
	control: Control<T>
	name: FieldPath<T>
}

/** react-hook-form binding: the replacement for `<select {...register(name)}>`. */
export function FormSelect<T extends FieldValues>({ control, name, ...rest }: FormSelectProps<T>) {
	return (
		<Controller
			control={control}
			name={name}
			render={({ field }) => (
				<Select {...rest} name={field.name} value={field.value as string | undefined} onChange={(e) => field.onChange(e.target.value)} onBlur={field.onBlur} />
			)}
		/>
	)
}
