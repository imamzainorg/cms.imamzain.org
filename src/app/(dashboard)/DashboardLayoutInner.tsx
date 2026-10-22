"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Toaster } from "sonner"
import { useAuthStore } from "@/store/auth"
import Sidebar from "@/components/layout/Sidebar"
import Header from "@/components/layout/Header"
import { PageTitleProvider } from "@/lib/page-title"

export default function DashboardLayoutInner({
	children,
}: {
	children: React.ReactNode
}) {
	const router = useRouter()
	const pathname = usePathname()
	const { user, isLoading, checkAuth } = useAuthStore()
	// An admin-reset account must pick its own password before doing anything
	// else; the API refuses every other route for it once enforcement is on.
	const mustChangePassword = !!user?.must_change_password
	const onProfile = pathname.startsWith("/dashboard/profile")

	useEffect(() => {
		checkAuth()
	}, [checkAuth])

	useEffect(() => {
		if (!isLoading && !user) {
			router.push("/login")
		}
	}, [user, isLoading, router])

	useEffect(() => {
		if (mustChangePassword && !onProfile) router.replace("/dashboard/profile")
	}, [mustChangePassword, onProfile, router])

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-lg text-gray-600">جارٍ التحميل...</div>
			</div>
		)
	}

	if (!user) return null
	if (mustChangePassword && !onProfile) return null

	return (
		<PageTitleProvider>
			<div className="min-h-screen bg-gray-50">
				<Sidebar />
				<div className="lg:pr-64">
					<Header />
					<main className="py-6">
						<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
					</main>
				</div>
			</div>
			<Toaster position="top-right" />
		</PageTitleProvider>
	)
}