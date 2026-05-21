"use client"

import { useAuthStore } from "@/store/auth"
import { LogOut, User, Menu, ChevronDown, X } from "lucide-react"
import { usePathname } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Sidebar from "./Sidebar"
import { usePageTitle } from "@/lib/page-title"

export default function Header() {
	const { user, logout } = useAuthStore()
	const pathname = usePathname()
	// Title is published by each route's <PageHeader> into PageTitleContext.
	// Falls back to the dashboard label so the bar isn't ever empty.
	const titleFromContext = usePageTitle()?.title
	const title = titleFromContext || "لوحة التحكم"
	const [showMobileMenu, setShowMobileMenu] = useState(false)
	const [showUserMenu, setShowUserMenu] = useState(false)
	const userMenuRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!showUserMenu) return
		const handler = (e: MouseEvent) => {
			if (
				userMenuRef.current &&
				!userMenuRef.current.contains(e.target as Node)
			) {
				setShowUserMenu(false)
			}
		}
		document.addEventListener("mousedown", handler)
		return () => document.removeEventListener("mousedown", handler)
	}, [showUserMenu])

	useEffect(() => {
		if (!showMobileMenu) return
		const prev = document.body.style.overflow
		document.body.style.overflow = "hidden"
		return () => {
			document.body.style.overflow = prev
		}
	}, [showMobileMenu])

	useEffect(() => {
		setShowMobileMenu(false)
	}, [pathname])

	return (
		<>
			<header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
				<div className="px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						<div className="flex items-center gap-3">
							<button
								onClick={() => setShowMobileMenu(true)}
								className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
								aria-label="فتح القائمة"
							>
								<Menu className="h-6 w-6" />
							</button>
							<h2 className="text-xl font-semibold text-gray-900">
								{title}
							</h2>
						</div>

						<div className="relative" ref={userMenuRef}>
							<button
								onClick={() => setShowUserMenu(!showUserMenu)}
								className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
							>
								<div className="w-8 h-8 rounded-full bg-linear-to-br from-primary to-primary/70 text-white flex items-center justify-center text-sm font-bold shrink-0">
									{user?.username[0]?.toUpperCase() ?? "?"}
								</div>
								<div className="hidden sm:block text-right">
									<p className="text-sm font-medium text-gray-900 leading-tight">
										{user?.username}
									</p>
									<p className="text-[10px] text-gray-500">
										{user?.roles?.[0] ?? "—"}
									</p>
								</div>
								<ChevronDown className="h-4 w-4 text-gray-400" />
							</button>

							{showUserMenu && (
								<div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 origin-top-left">
									<div className="px-4 py-3 border-b border-gray-100">
										<p className="text-sm font-medium text-gray-900">
											{user?.username}
										</p>
										<p className="text-xs text-gray-500 mt-0.5">
											{user?.permissions?.length ?? 0}{" "}
											صلاحية
										</p>
									</div>
									<Link
										href="/dashboard/profile"
										onClick={() => setShowUserMenu(false)}
										className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
									>
										<User className="h-4 w-4 text-gray-400" />
										حسابي
									</Link>
									<button
										onClick={logout}
										className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
									>
										<LogOut className="h-4 w-4" />
										تسجيل الخروج
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</header>

			{/* Mobile drawer */}
			{showMobileMenu && (
				<div className="lg:hidden fixed inset-0 z-40">
					<div
						className="absolute inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => setShowMobileMenu(false)}
					/>
					<div className="absolute inset-y-0 right-0 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col">
						<div className="flex items-center justify-end px-2 py-2 border-b border-gray-100">
							<button
								onClick={() => setShowMobileMenu(false)}
								className="p-2 rounded-md text-gray-500 hover:bg-gray-100 cursor-pointer"
								aria-label="إغلاق القائمة"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto">
							<Sidebar
								mobile
								onNavigate={() => setShowMobileMenu(false)}
							/>
						</div>
					</div>
				</div>
			)}
		</>
	)
}
