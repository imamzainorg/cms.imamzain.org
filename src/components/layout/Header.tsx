"use client"

import { useAuthStore } from "@/store/auth"
import { LogOut, User, Menu } from "lucide-react"
import { usePathname } from "next/navigation"
import { useState } from "react"

const pageTitles: Record<string, string> = {
	"/dashboard": "لوحة التحكم",
	"/dashboard/posts": "المقالات",
	"/dashboard/posts/new": "مقالة جديدة",
	"/dashboard/books": "الكتب",
	"/dashboard/books/new": "كتاب جديد",
	"/dashboard/papers": "الأبحاث العلمية",
	"/dashboard/papers/new": "بحث جديد",
	"/dashboard/gallery": "معرض الصور",
	"/dashboard/media": "مكتبة الوسائط",
	"/dashboard/contacts": "رسائل التواصل",
	"/dashboard/proxy-visits": "طلبات الزيارة بالوكالة",
	"/dashboard/newsletter": "النشرة البريدية",
	"/dashboard/contest": "المسابقات",
	"/dashboard/users": "المستخدمون",
	"/dashboard/users/new": "مستخدم جديد",
	"/dashboard/roles": "الأدوار والصلاحيات",
	"/dashboard/languages": "اللغات",
	"/dashboard/audit-logs": "سجلات التدقيق",
	"/dashboard/settings": "الإعدادات",
}

export default function Header() {
	const { user, logout } = useAuthStore()
	const pathname = usePathname()
	const [showMobileMenu, setShowMobileMenu] = useState(false)

	const getPageTitle = () => {
		if (pageTitles[pathname]) return pageTitles[pathname]
		if (pathname.match(/\/dashboard\/[^/]+\/[^/]+$/)) {
			const basePath = pathname.replace(/\/[^/]+$/, "")
			const base = pageTitles[basePath]
			return base ? `تعديل ${base}` : "تعديل"
		}
		for (const [path, title] of Object.entries(pageTitles)) {
			if (pathname.startsWith(path) && path !== "/dashboard") return title
		}
		return "لوحة التحكم"
	}

	return (
		<header className="bg-white shadow-sm border-b border-gray-200">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-16">
					<button
						onClick={() => setShowMobileMenu(!showMobileMenu)}
						className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
					>
						<Menu className="h-6 w-6" />
					</button>

					<h2 className="text-xl font-semibold text-gray-900">{getPageTitle()}</h2>

					<div className="flex items-center gap-4">
						<div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
							<User className="h-4 w-4" />
							<span>{user?.username}</span>
						</div>
						<button
							onClick={logout}
							className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
						>
							<LogOut className="h-4 w-4" />
							<span className="hidden sm:inline">تسجيل خروج</span>
						</button>
					</div>
				</div>
			</div>

			{showMobileMenu && (
				<div className="lg:hidden border-t border-gray-200 px-4 py-3">
					<p className="text-sm text-gray-600">مسجل الدخول كـ: {user?.username}</p>
				</div>
			)}
		</header>
	)
}
