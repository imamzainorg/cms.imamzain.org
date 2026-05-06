"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
	FileText,
	BookOpen,
	GraduationCap,
	Image,
	Mail,
	Users,
	Newspaper,
	Settings,
	LayoutDashboard,
	Shield,
	Globe,
	ClipboardList,
	Trophy,
} from "lucide-react"

const navigation = [
	{ name: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard },
	{ name: "المقالات", href: "/dashboard/posts", icon: FileText },
	{ name: "الكتب", href: "/dashboard/books", icon: BookOpen },
	{ name: "الأبحاث", href: "/dashboard/papers", icon: GraduationCap },
	{ name: "معرض الصور", href: "/dashboard/gallery", icon: Image },
	{ name: "مكتبة الوسائط", href: "/dashboard/media", icon: Image },
	{ name: "رسائل التواصل", href: "/dashboard/contacts", icon: Mail },
	{ name: "طلبات الزيارة", href: "/dashboard/proxy-visits", icon: Users },
	{ name: "النشرة البريدية", href: "/dashboard/newsletter", icon: Newspaper },
	{ name: "المسابقات", href: "/dashboard/contest", icon: Trophy },
	{ name: "المستخدمون", href: "/dashboard/users", icon: Users },
	{ name: "الأدوار والصلاحيات", href: "/dashboard/roles", icon: Shield },
	{ name: "اللغات", href: "/dashboard/languages", icon: Globe },
	{ name: "سجلات التدقيق", href: "/dashboard/audit-logs", icon: ClipboardList },
	{ name: "الإعدادات", href: "/dashboard/settings", icon: Settings },
]

export default function Sidebar() {
	const pathname = usePathname()

	return (
		<div className="hidden lg:fixed lg:inset-y-0 lg:right-0 lg:flex lg:w-64 lg:flex-col">
			<div className="flex flex-col grow bg-white border-l border-gray-200 pt-5 pb-4 overflow-y-auto">
				<div className="flex items-center shrink-0 px-4">
					<h1 className="text-xl font-bold text-primary">الإمام زين CMS</h1>
				</div>
				<nav className="mt-8 flex-1 px-2 space-y-1">
					{navigation.map((item) => {
						const Icon = item.icon
						const isActive =
							pathname === item.href || pathname.startsWith(`${item.href}/`)
						return (
							<Link
								key={item.name}
								href={item.href}
								className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
									isActive
										? "bg-primary/10 text-primary"
										: "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
								}`}
							>
								<Icon
									className={`ml-3 h-5 w-5 flex-shrink-0 ${isActive ? "text-primary" : "text-gray-400 group-hover:text-gray-600"}`}
								/>
								{item.name}
							</Link>
						)
					})}
				</nav>
				<div className="px-4 py-4 border-t border-gray-200">
					<p className="text-xs text-gray-500 text-center">
						{new Date().getFullYear()} الإمام زين العابدين
					</p>
				</div>
			</div>
		</div>
	)
}
