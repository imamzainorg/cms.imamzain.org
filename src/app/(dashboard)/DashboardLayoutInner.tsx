"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Toaster } from "sonner"
import { useAuthStore } from "@/store/auth"
import Sidebar from "@/components/layout/Sidebar"
import Header from "@/components/layout/Header"

export default function DashboardLayoutInner({
	children,
}: {
	children: React.ReactNode
}) {
	const router = useRouter()
	const { user, isLoading, checkAuth } = useAuthStore()

	useEffect(() => {
		checkAuth()
	}, [checkAuth])

	useEffect(() => {
		if (!isLoading && !user) {
			router.push("/login")
		}
	}, [user, isLoading, router])

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-lg text-gray-600">Loading...</div>
			</div>
		)
	}

	if (!user) return null

	return (
		<>
			<div className="min-h-screen bg-gray-50">
				<Sidebar />
				<div className="lg:pl-64">
					<Header />
					<main className="py-6">
						<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
					</main>
				</div>
			</div>
			<Toaster position="top-right" />
		</>
	)
}