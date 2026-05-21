"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
	FileText,
	BookOpen,
	GraduationCap,
	Image as ImageIcon,
	Mail,
	Users,
	Newspaper,
	LayoutDashboard,
	Shield,
	Globe,
	ClipboardList,
	Trophy,
	UserCircle,
	Library,
	ChevronDown,
	FolderTree,
	BookOpenText,
	Settings as SettingsIcon,
	List,
	Trash2,
	type LucideIcon,
} from "lucide-react"
import Image from "next/image"

type Child = {
	name: string
	href: string
	icon?: LucideIcon
}

type Item = {
	name: string
	href: string
	icon: LucideIcon
	children?: Child[]
}

const groups: { title: string; items: Item[] }[] = [
	{
		title: "نظرة عامة",
		items: [
			{ name: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard },
		],
	},
	{
		title: "المحتوى",
		items: [
			{
				name: "المقالات",
				href: "/dashboard/posts",
				icon: FileText,
				children: [
					{ name: "كل المقالات", href: "/dashboard/posts", icon: List },
					{ name: "التصنيفات", href: "/dashboard/post-categories", icon: FolderTree },
					{ name: "سلة المهملات", href: "/dashboard/posts/trash", icon: Trash2 },
				],
			},
			{
				name: "المكتبة",
				href: "/dashboard/books",
				icon: BookOpen,
				children: [
					{ name: "كل الكتب", href: "/dashboard/books", icon: List },
					{ name: "التصنيفات", href: "/dashboard/book-categories", icon: FolderTree },
					{ name: "سلة المهملات", href: "/dashboard/books/trash", icon: Trash2 },
				],
			},
			{
				name: "الأبحاث",
				href: "/dashboard/papers",
				icon: GraduationCap,
				children: [
					{ name: "كل الأبحاث", href: "/dashboard/papers", icon: List },
					{ name: "التصنيفات", href: "/dashboard/paper-categories", icon: FolderTree },
					{ name: "سلة المهملات", href: "/dashboard/papers/trash", icon: Trash2 },
				],
			},
			{
				name: "معرض الصور",
				href: "/dashboard/gallery",
				icon: ImageIcon,
				children: [
					{ name: "كل الصور", href: "/dashboard/gallery", icon: List },
					{ name: "التصنيفات", href: "/dashboard/gallery-categories", icon: FolderTree },
					{ name: "سلة المهملات", href: "/dashboard/gallery/trash", icon: Trash2 },
				],
			},
			{ name: "مكتبة الوسائط", href: "/dashboard/media", icon: Library },
			{ name: "الأحاديث اليومية", href: "/dashboard/daily-hadiths", icon: BookOpenText },
		],
	},
	{
		title: "النماذج والتفاعل",
		items: [
			{ name: "رسائل التواصل", href: "/dashboard/contacts", icon: Mail },
			{ name: "طلبات الزيارة", href: "/dashboard/proxy-visits", icon: Users },
			{
				name: "النشرة البريدية",
				href: "/dashboard/newsletter",
				icon: Newspaper,
				children: [{ name: "الحملات", href: "/dashboard/campaigns" }],
			},
			{ name: "المسابقات", href: "/dashboard/contest", icon: Trophy },
		],
	},
	{
		title: "الإدارة",
		items: [
			{ name: "المستخدمون", href: "/dashboard/users", icon: Users },
			{ name: "الأدوار والصلاحيات", href: "/dashboard/roles", icon: Shield },
			{ name: "اللغات", href: "/dashboard/languages", icon: Globe },
			{ name: "إعدادات الموقع", href: "/dashboard/settings", icon: SettingsIcon },
			{ name: "سجلات التدقيق", href: "/dashboard/audit-logs", icon: ClipboardList },
			{ name: "حسابي", href: "/dashboard/profile", icon: UserCircle },
		],
	},
]

function isPathActive(pathname: string, href: string): boolean {
	if (href === "/dashboard") return pathname === href
	return pathname === href || pathname.startsWith(`${href}/`)
}

function isItemOrChildActive(pathname: string, item: Item): boolean {
	if (isPathActive(pathname, item.href)) return true
	return item.children?.some((c) => isPathActive(pathname, c.href)) ?? false
}

function isChildActive(pathname: string, child: Child, parentHref: string): boolean {
	if (child.href === parentHref) return pathname === child.href
	return isPathActive(pathname, child.href)
}

type SidebarProps = {
	onNavigate?: () => void
	mobile?: boolean
}

export default function Sidebar({ onNavigate, mobile = false }: SidebarProps) {
	const pathname = usePathname()
	const [manualOverrides, setManualOverrides] = useState<Record<string, boolean>>({})

	const isOpenFor = (item: Item) => {
		if (item.href in manualOverrides) return manualOverrides[item.href]
		return isItemOrChildActive(pathname, item)
	}

	const toggleItem = (item: Item) => {
		setManualOverrides((prev) => ({
			...prev,
			[item.href]: !isOpenFor(item),
		}))
	}

	const containerClass = mobile
		? "flex flex-col h-full bg-white"
		: "hidden lg:fixed lg:inset-y-0 lg:right-0 lg:flex lg:w-64 lg:flex-col z-30"

	const innerClass = mobile
		? "flex flex-col grow overflow-y-auto"
		: "flex flex-col grow bg-white border-l border-[hsl(var(--border))] overflow-y-auto"

	return (
		<div className={containerClass}>
			<div className={innerClass}>
				{/* Wordmark — "مركز إدارة المحتوى" with foundation tagline below;
				    sits over a quiet eight-pointed star ornament wash. Fixed at
				    h-16 (64px) so the bottom border aligns exactly with the
				    Header's border-b — otherwise the logo block visually
				    extends below the navbar line and looks "covered" by it. */}
				<div className="relative h-16 shrink-0 border-b border-[hsl(var(--border))] overflow-hidden">
					<div className="absolute inset-0 ornament-tile pointer-events-none" aria-hidden />
					<Link
						href="/dashboard"
						onClick={onNavigate}
						aria-label="مركز إدارة المحتوى — مؤسسة الإمام زين العابدين للبحوث والدراسات"
						className="relative h-full flex items-center gap-2.5 px-4 group"
					>
						<Image
							src="/brand/logo/logo-icon.png"
							alt=""
							width={64}
							height={64}
							priority
							className="h-9 w-9 object-contain shrink-0 transition-opacity group-hover:opacity-90"
						/>
						<div className="min-w-0">
							<p className="text-[14px] font-semibold text-primary leading-tight tracking-tight">
								مركز إدارة المحتوى
							</p>
							<p className="text-[10px] text-[hsl(var(--foreground-muted))] mt-0.5 leading-snug truncate">
								مؤسسة الإمام زين العابدين للبحوث والدراسات
							</p>
						</div>
					</Link>
				</div>

				<nav className="flex-1 px-3 py-4 space-y-5">
					{groups.map((group) => (
						<div key={group.title}>
							{/* Section title — Arabic Naskh at 11.5px / 600, full-foreground so it
							    actually reads as a section header (the original uppercase Latin-mono
							    caption was barely visible). */}
							<h3 className="px-3 text-[11.5px] font-semibold text-foreground mb-1.5">
								{group.title}
							</h3>
							<div className="space-y-0.5">
								{group.items.map((item) => {
									const Icon = item.icon
									const hasChildren = !!item.children?.length
									const itemActive = hasChildren
										? pathname === item.href
										: isPathActive(pathname, item.href)
									const branchActive = isItemOrChildActive(pathname, item)
									const isOpen = hasChildren ? isOpenFor(item) : false

									return (
										<div key={item.href}>
											<div
												className={`group flex items-center rounded-md transition-colors ${
													itemActive
														? "bg-primary text-white shadow-soft"
														: branchActive
															? "bg-[hsl(var(--accent))] text-primary"
															: "text-foreground hover:bg-surface-muted hover:text-primary"
												}`}
											>
												<Link
													href={item.href}
													onClick={onNavigate}
													className={`flex items-center px-3 py-2 text-[13px] flex-1 min-w-0 ${
														itemActive ? "font-semibold" : "font-medium"
													}`}
												>
													<Icon
														className={`ml-3 h-4 w-4 shrink-0 ${
															itemActive
																? "text-white"
																: branchActive
																	? "text-primary"
																	: "text-[hsl(var(--foreground-subtle))] group-hover:text-primary"
														}`}
														strokeWidth={1.6}
													/>
													<span className="truncate">{item.name}</span>
												</Link>
												{hasChildren && (
													<button
														type="button"
														onClick={() => toggleItem(item)}
														aria-label={isOpen ? "طيّ" : "توسيع"}
														aria-expanded={isOpen}
														className={`p-1.5 ml-1 mr-1 rounded cursor-pointer ${
															itemActive
																? "text-white/80 hover:bg-white/10"
																: "text-[hsl(var(--foreground-subtle))] hover:bg-surface-muted hover:text-foreground"
														}`}
													>
														<ChevronDown
															className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
															strokeWidth={1.6}
														/>
													</button>
												)}
											</div>

											{hasChildren && isOpen && (
												<div className="mt-0.5 mr-6 pr-3 border-r border-[hsl(var(--border))] space-y-0.5">
													{item.children!.map((child) => {
														const childActive = isChildActive(pathname, child, item.href)
														const ChildIcon = child.icon ?? FolderTree
														return (
															<Link
																key={child.href}
																href={child.href}
																onClick={onNavigate}
																className={`flex items-center gap-2 px-3 py-1.5 text-[12.5px] rounded-md transition-colors ${
																	childActive
																		? "bg-[hsl(var(--primary)/0.1)] text-primary font-medium"
																		: "text-[hsl(var(--foreground-muted))] hover:bg-surface-muted hover:text-primary"
																}`}
															>
																<ChildIcon
																	className="h-3 w-3 shrink-0 opacity-60"
																	strokeWidth={1.6}
																/>
																<span className="truncate">{child.name}</span>
															</Link>
														)
													})}
												</div>
											)}
										</div>
									)
								})}
							</div>
						</div>
					))}
				</nav>

				<div className="relative shrink-0 px-4 py-3 border-t border-[hsl(var(--border))] overflow-hidden">
					<div
						className="absolute inset-x-0 top-0 h-px pointer-events-none divider-brand"
						aria-hidden
					/>
					<p className="text-[10.5px] text-[hsl(var(--foreground-muted))] text-center leading-relaxed">
						© {new Date().getFullYear()} مؤسسة الإمام زين العابدين
						<br />
						<span className="text-[hsl(var(--foreground-subtle))]">للبحوث والدراسات</span>
					</p>
				</div>
			</div>
		</div>
	)
}
