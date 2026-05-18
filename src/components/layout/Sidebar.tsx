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
					{
						name: "كل المقالات",
						href: "/dashboard/posts",
						icon: List,
					},
					{
						name: "التصنيفات",
						href: "/dashboard/post-categories",
						icon: FolderTree,
					},
					{
						name: "سلة المهملات",
						href: "/dashboard/posts/trash",
						icon: Trash2,
					},
				],
			},
			{
				name: "المكتبة",
				href: "/dashboard/books",
				icon: BookOpen,
				children: [
					{ name: "كل الكتب", href: "/dashboard/books", icon: List },
					{
						name: "التصنيفات",
						href: "/dashboard/book-categories",
						icon: FolderTree,
					},
					{
						name: "سلة المهملات",
						href: "/dashboard/books/trash",
						icon: Trash2,
					},
				],
			},
			{
				name: "الأبحاث",
				href: "/dashboard/papers",
				icon: GraduationCap,
				children: [
					{
						name: "كل الأبحاث",
						href: "/dashboard/papers",
						icon: List,
					},
					{
						name: "التصنيفات",
						href: "/dashboard/paper-categories",
						icon: FolderTree,
					},
					{
						name: "سلة المهملات",
						href: "/dashboard/papers/trash",
						icon: Trash2,
					},
				],
			},
			{
				name: "معرض الصور",
				href: "/dashboard/gallery",
				icon: ImageIcon,
				children: [
					{
						name: "كل الصور",
						href: "/dashboard/gallery",
						icon: List,
					},
					{
						name: "التصنيفات",
						href: "/dashboard/gallery-categories",
						icon: FolderTree,
					},
					{
						name: "سلة المهملات",
						href: "/dashboard/gallery/trash",
						icon: Trash2,
					},
				],
			},
			{ name: "مكتبة الوسائط", href: "/dashboard/media", icon: Library },
			{
				name: "الأحاديث اليومية",
				href: "/dashboard/daily-hadiths",
				icon: BookOpenText,
			},
		],
	},
	{
		title: "النماذج والتفاعل",
		items: [
			{ name: "رسائل التواصل", href: "/dashboard/contacts", icon: Mail },
			{
				name: "طلبات الزيارة",
				href: "/dashboard/proxy-visits",
				icon: Users,
			},
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
			{
				name: "الأدوار والصلاحيات",
				href: "/dashboard/roles",
				icon: Shield,
			},
			{ name: "اللغات", href: "/dashboard/languages", icon: Globe },
			{
				name: "إعدادات الموقع",
				href: "/dashboard/settings",
				icon: SettingsIcon,
			},
			{
				name: "سجلات التدقيق",
				href: "/dashboard/audit-logs",
				icon: ClipboardList,
			},
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

/**
 * Exact match for the "all items" child entries (which share the parent's href).
 * Without this, the parent prefix-match treats every sub-route (including /trash)
 * as "active" for the "كل ..." link.
 */
function isChildActive(
	pathname: string,
	child: Child,
	parentHref: string,
): boolean {
	if (child.href === parentHref) return pathname === child.href
	return isPathActive(pathname, child.href)
}

type SidebarProps = {
	onNavigate?: () => void
	mobile?: boolean
}

export default function Sidebar({ onNavigate, mobile = false }: SidebarProps) {
	const pathname = usePathname()
	// `manualOverrides` records explicit user toggles. The "default open" is
	// derived from the current path (branch-active items expand on their own),
	// so we don't sync via useEffect — that triggers React 19's
	// `react-hooks/set-state-in-effect` rule.
	const [manualOverrides, setManualOverrides] = useState<
		Record<string, boolean>
	>({})

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
		: "flex flex-col grow bg-white border-l border-gray-200 overflow-y-auto"

	return (
		<div className={containerClass}>
			<div className={innerClass}>
				{/* Brand: horizontal logo (viewBox 1920×639 ≈ 3:1) sized to the
				    column width so it breathes; subtitle sits directly below. */}
				<div className="px-5 py-5 border-b border-gray-100">
					<Link
						href="/dashboard"
						onClick={onNavigate}
						aria-label="مؤسسة الإمام زين العابدين — لوحة التحكم"
						className="flex flex-col items-center gap-2 group"
					>
						<Image
							src="/logo-horizontal.svg"
							alt="مؤسسة الإمام زين العابدين"
							width={1920}
							height={639}
							priority
							className="w-40 h-auto transition-opacity group-hover:opacity-90"
						/>
						<p className="text-[11px] text-gray-500 tracking-wide">
							نظام إدارة المحتوى
						</p>
					</Link>
				</div>

				<nav className="flex-1 px-3 py-4 space-y-5">
					{groups.map((group) => (
						<div key={group.title}>
							<h3 className="px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
								{group.title}
							</h3>
							<div className="space-y-0.5">
								{group.items.map((item) => {
									const Icon = item.icon
									const hasChildren = !!item.children?.length
									// When a parent has children, "item active" should mean *exactly on*
									// the parent index page, not any descendant — otherwise the parent
									// pill grabs the highlight from sub-routes like /trash.
									const itemActive = hasChildren
										? pathname === item.href
										: isPathActive(pathname, item.href)
									const branchActive = isItemOrChildActive(
										pathname,
										item,
									)
									const isOpen = hasChildren
										? isOpenFor(item)
										: false

									return (
										<div key={item.href}>
											<div
												className={`group flex items-center rounded-md transition-colors ${
													itemActive
														? "bg-primary text-white shadow-sm"
														: branchActive
															? "bg-primary/5 text-primary"
															: "text-gray-700 hover:bg-primary/5 hover:text-primary"
												}`}
											>
												<Link
													href={item.href}
													onClick={onNavigate}
													className="flex items-center px-3 py-2 text-sm flex-1 min-w-0"
												>
													<Icon
														className={`ml-3 h-4 w-4 shrink-0 ${
															itemActive
																? "text-white"
																: branchActive
																	? "text-primary"
																	: "text-gray-400 group-hover:text-primary"
														}`}
													/>
													<span className="truncate">
														{item.name}
													</span>
												</Link>
												{hasChildren && (
													<button
														type="button"
														onClick={() =>
															toggleItem(item)
														}
														aria-label={
															isOpen
																? "طيّ"
																: "توسيع"
														}
														aria-expanded={isOpen}
														className={`p-1.5 ml-1 mr-1 rounded cursor-pointer ${
															itemActive
																? "text-white/80 hover:bg-white/10"
																: "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
														}`}
													>
														<ChevronDown
															className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
														/>
													</button>
												)}
											</div>

											{hasChildren && isOpen && (
												<div className="mt-0.5 mr-6 pr-3 border-r border-gray-100 space-y-0.5">
													{item.children!.map(
														(child) => {
															const childActive =
																isChildActive(
																	pathname,
																	child,
																	item.href,
																)
															const ChildIcon =
																child.icon ??
																FolderTree
															return (
																<Link
																	key={
																		child.href
																	}
																	href={
																		child.href
																	}
																	onClick={
																		onNavigate
																	}
																	className={`flex items-center gap-2 px-3 py-1.5 text-[13px] rounded-md transition-colors ${
																		childActive
																			? "bg-primary/10 text-primary font-medium"
																			: "text-gray-600 hover:bg-gray-50 hover:text-primary"
																	}`}
																>
																	<ChildIcon className="h-3 w-3 shrink-0 opacity-60" />
																	<span className="truncate">
																		{
																			child.name
																		}
																	</span>
																</Link>
															)
														},
													)}
												</div>
											)}
										</div>
									)
								})}
							</div>
						</div>
					))}
				</nav>

				<div className="px-4 py-3 border-t border-gray-100 bg-linear-to-l from-secondary/5 to-primary/5">
					<p className="text-[11px] text-gray-500 text-center leading-relaxed">
						© {new Date().getFullYear()} مؤسسة الإمام زين العابدين
						<br />
						<span className="text-gray-400">للبحوث والدراسات</span>
					</p>
				</div>
			</div>
		</div>
	)
}
