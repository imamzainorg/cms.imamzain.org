"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form"
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react"

const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
// Week starts on Saturday, as in Arabic locales.
const WEEKDAYS = ["سبت", "أحد", "اثن", "ثلا", "أرب", "خمي", "جمع"]

function parse(value: string): { date: Date; hh: number; mm: number } | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value || "")
	if (!m) return null
	return { date: new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])), hh: Number(m[4] ?? 0), mm: Number(m[5] ?? 0) }
}

type Props = {
	/** "YYYY-MM-DD", or "YYYY-MM-DDTHH:mm" when `withTime`. "" = empty. */
	value: string
	onChange: (value: string) => void
	withTime?: boolean
	min?: string
	max?: string
	disabled?: boolean
	className?: string
	placeholder?: string
	"aria-label"?: string
}

export default function DatePicker({
	value, onChange, withTime = false, min, max, disabled, className = "", placeholder, "aria-label": ariaLabel,
}: Props) {
	const parsed = parse(value)
	const today = new Date()
	const [open, setOpen] = useState(false)
	const [view, setView] = useState(() => new Date((parsed?.date ?? today).getFullYear(), (parsed?.date ?? today).getMonth(), 1))
	const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null)
	const btnRef = useRef<HTMLButtonElement>(null)
	const popRef = useRef<HTMLDivElement>(null)

	const WIDTH = 296
	const place = useCallback(() => {
		const r = btnRef.current?.getBoundingClientRect()
		if (!r) return
		const gap = 6
		const flip = window.innerHeight - r.bottom < 400 && r.top > window.innerHeight - r.bottom
		const left = Math.min(Math.max(8, r.left), window.innerWidth - WIDTH - 8)
		setPos(flip ? { left, bottom: window.innerHeight - r.top + gap } : { left, top: r.bottom + gap })
	}, [])

	useLayoutEffect(() => { if (open) place() }, [open, place])
	useEffect(() => {
		if (!open) return
		const onDown = (e: MouseEvent) => {
			const t = e.target as Node
			if (popRef.current?.contains(t) || btnRef.current?.contains(t)) return
			setOpen(false)
		}
		const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
		const onScroll = (e: Event) => { if (!popRef.current?.contains(e.target as Node)) place() }
		document.addEventListener("mousedown", onDown)
		document.addEventListener("keydown", onKey)
		window.addEventListener("resize", place)
		window.addEventListener("scroll", onScroll, true)
		return () => {
			document.removeEventListener("mousedown", onDown)
			document.removeEventListener("keydown", onKey)
			window.removeEventListener("resize", place)
			window.removeEventListener("scroll", onScroll, true)
		}
	}, [open, place])

	const openPicker = () => {
		const base = parsed?.date ?? today
		setView(new Date(base.getFullYear(), base.getMonth(), 1))
		setOpen(true)
	}

	const days = useMemo(() => {
		const first = new Date(view.getFullYear(), view.getMonth(), 1)
		const lead = (first.getDay() + 1) % 7 // Saturday = 0
		const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
		const cells: (Date | null)[] = Array(lead).fill(null)
		for (let d = 1; d <= count; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d))
		while (cells.length % 7) cells.push(null)
		return cells
	}, [view])

	const out = (d: Date, hh: number, mm: number) => (withTime ? `${ymd(d)}T${pad(hh)}:${pad(mm)}` : ymd(d))
	const blocked = (d: Date) => (!!min && ymd(d) < min.slice(0, 10)) || (!!max && ymd(d) > max.slice(0, 10))
	const hh = parsed?.hh ?? 9
	const mm = parsed?.mm ?? 0

	const pick = (d: Date) => {
		if (blocked(d)) return
		onChange(out(d, hh, mm))
		if (!withTime) setOpen(false)
	}
	const setTime = (nh: number, nm: number) => onChange(out(parsed?.date ?? today, nh, nm))

	const label = parsed
		? `${pad(parsed.date.getDate())}/${pad(parsed.date.getMonth() + 1)}/${parsed.date.getFullYear()}${withTime ? `  ${pad(parsed.hh)}:${pad(parsed.mm)}` : ""}`
		: ""

	return (
		<>
			<button
				ref={btnRef}
				type="button"
				disabled={disabled}
				aria-label={ariaLabel}
				aria-haspopup="dialog"
				aria-expanded={open}
				onClick={() => (open ? setOpen(false) : openPicker())}
				className={`cursor-pointer flex items-center justify-between gap-3 text-start bg-white outline-none transition-colors hover:border-gray-400 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary disabled:opacity-50 disabled:cursor-not-allowed ${open ? "ring-2 ring-primary/30 border-primary" : ""} ${className}`}
			>
				<span className={`truncate tabular-nums ${label ? "" : "text-gray-400"}`} dir="ltr">{label || placeholder || (withTime ? "اختر التاريخ والوقت" : "اختر التاريخ")}</span>
				<CalendarDays className="h-4 w-4 shrink-0 mx-0.5 text-gray-500" strokeWidth={1.8} />
			</button>
			{open && pos && createPortal(
				<div
					ref={popRef}
					role="dialog"
					dir="rtl"
					style={{ position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom, width: WIDTH, zIndex: 100 }}
					className="bg-white border border-gray-200 rounded-2xl shadow-2xl ring-1 ring-black/5 p-3"
				>
					<div className="flex items-center justify-between mb-2">
						<button type="button" aria-label="الشهر السابق" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
							className="cursor-pointer p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"><ChevronRight className="h-4 w-4" /></button>
						<span className="text-sm font-semibold text-gray-900">{MONTHS[view.getMonth()]} {view.getFullYear()}</span>
						<button type="button" aria-label="الشهر التالي" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
							className="cursor-pointer p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"><ChevronLeft className="h-4 w-4" /></button>
					</div>
					<div className="grid grid-cols-7 text-center text-[11px] font-medium text-gray-400 mb-1">
						{WEEKDAYS.map((w) => <span key={w} className="py-1">{w}</span>)}
					</div>
					<div className="grid grid-cols-7 gap-y-0.5">
						{days.map((d, i) => {
							if (!d) return <span key={i} />
							const sel = parsed && ymd(d) === ymd(parsed.date)
							const isToday = ymd(d) === ymd(today)
							const off = blocked(d)
							return (
								<button
									key={i}
									type="button"
									disabled={off}
									onClick={() => pick(d)}
									className={`cursor-pointer mx-auto h-9 w-9 rounded-full text-sm tabular-nums transition-colors ${sel ? "bg-primary text-white font-semibold" : isToday ? "border border-primary text-primary hover:bg-primary/10" : "text-gray-800 hover:bg-gray-100"} ${off ? "!text-gray-300 !cursor-not-allowed hover:!bg-transparent" : ""}`}
								>
									{d.getDate()}
								</button>
							)
						})}
					</div>
					{withTime && (
						<div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-center gap-2" dir="ltr">
							<TimeBox value={hh} max={23} label="ساعة" onChange={(n) => setTime(n, mm)} />
							<span className="text-gray-400 font-semibold">:</span>
							<TimeBox value={mm} max={59} label="دقيقة" onChange={(n) => setTime(hh, n)} />
						</div>
					)}
					<div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
						<button type="button" onClick={() => { onChange(""); setOpen(false) }}
							className="cursor-pointer inline-flex items-center gap-1 text-gray-500 hover:text-red-600"><X className="h-3.5 w-3.5" />مسح</button>
						<div className="flex gap-3">
							<button type="button" onClick={() => { const t = new Date(); setView(new Date(t.getFullYear(), t.getMonth(), 1)); if (!blocked(t)) pick(t) }}
								className="cursor-pointer text-primary font-medium hover:underline">اليوم</button>
							{withTime && (
								<button type="button" onClick={() => setOpen(false)}
									className="cursor-pointer px-3 py-1 rounded-md bg-primary text-white text-xs font-medium hover:bg-primary/90">تم</button>
							)}
						</div>
					</div>
				</div>,
				document.body,
			)}
		</>
	)
}

function TimeBox({ value, max, label, onChange }: { value: number; max: number; label: string; onChange: (n: number) => void }) {
	return (
		<input
			type="text"
			inputMode="numeric"
			aria-label={label}
			value={pad(value)}
			onFocus={(e) => e.currentTarget.select()}
			onChange={(e) => {
				const n = Number(e.target.value.replace(/\D/g, "").slice(-2))
				if (!Number.isNaN(n)) onChange(Math.min(max, n))
			}}
			className="w-14 py-1.5 text-center text-sm tabular-nums border border-gray-300 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
		/>
	)
}

type FormDatePickerProps<T extends FieldValues> = Omit<Props, "value" | "onChange"> & { control: Control<T>; name: FieldPath<T> }

/** react-hook-form binding for `<input type="datetime-local" {...register(name)}>`. */
export function FormDatePicker<T extends FieldValues>({ control, name, ...rest }: FormDatePickerProps<T>) {
	return (
		<Controller control={control} name={name} render={({ field }) => (
			<DatePicker {...rest} value={(field.value as string) ?? ""} onChange={field.onChange} />
		)} />
	)
}
