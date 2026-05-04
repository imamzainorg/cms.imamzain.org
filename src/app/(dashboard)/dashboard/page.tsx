"use client"

import { useEffect, useState } from "react"
import { postsService } from "@/services/posts.service"
import { booksService } from "@/services/books.service"
import { papersService } from "@/services/papers.service"
import { galleryService } from "@/services/gallery.service"
import { contactsService } from "@/services/contacts.service"
import { proxyVisitsService } from "@/services/proxy-visits.service"
import { BookOpen, FileText, Mail, Users, GraduationCap, Image, Loader2 } from "lucide-react"
import Link from "next/link"

type Stats = { posts: number; books: number; papers: number; gallery: number; newContacts: number; pendingVisits: number }

const cards = [
	{ key: "posts" as const, label: "Total Posts", icon: FileText, href: "/dashboard/posts", color: "text-blue-600", bg: "bg-blue-50" },
	{ key: "books" as const, label: "Total Books", icon: BookOpen, href: "/dashboard/books", color: "text-green-600", bg: "bg-green-50" },
	{ key: "papers" as const, label: "Academic Papers", icon: GraduationCap, href: "/dashboard/papers", color: "text-purple-600", bg: "bg-purple-50" },
	{ key: "gallery" as const, label: "Gallery Images", icon: Image, href: "/dashboard/gallery", color: "text-pink-600", bg: "bg-pink-50" },
	{ key: "newContacts" as const, label: "New Contacts", icon: Mail, href: "/dashboard/contacts", color: "text-orange-600", bg: "bg-orange-50" },
	{ key: "pendingVisits" as const, label: "Pending Visits", icon: Users, href: "/dashboard/proxy-visits", color: "text-teal-600", bg: "bg-teal-50" },
]

export default function DashboardPage() {
	const [stats, setStats] = useState<Stats | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => { loadStats() }, [])

	const loadStats = async () => {
		try {
			const [posts, books, papers, gallery, contacts, visits] = await Promise.all([
				postsService.list({ limit: 1 }).then((r) => r.data.total).catch(() => 0),
				booksService.list({ limit: 1 }).then((r) => r.data.total).catch(() => 0),
				papersService.list({ limit: 1 }).then((r) => r.data.total).catch(() => 0),
				galleryService.list({ limit: 1 }).then((r) => r.data.total).catch(() => 0),
				contactsService.list({ limit: 1, status: "NEW" }).then((r) => r.data.total).catch(() => 0),
				proxyVisitsService.list({ limit: 1, status: "PENDING" }).then((r) => r.data.total).catch(() => 0),
			])
			setStats({ posts, books, papers, gallery, newContacts: contacts, pendingVisits: visits })
		} finally { setIsLoading(false) }
	}

	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

	return (
		<div>
			<h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
			<p className="text-gray-600 mb-6">Welcome to the Imam Zain CMS</p>

			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{cards.map(({ key, label, icon: Icon, href, color, bg }) => (
					<Link key={key} href={href}>
						<div className="bg-white overflow-hidden shadow-sm rounded-lg hover:shadow-md transition-shadow">
							<div className="p-5 flex items-center">
								<div className={`shrink-0 p-3 rounded-lg ${bg}`}><Icon className={`h-6 w-6 ${color}`} /></div>
								<div className="ml-5">
									<p className="text-sm font-medium text-gray-500">{label}</p>
									<p className="text-2xl font-semibold text-gray-900">{stats?.[key] ?? 0}</p>
								</div>
							</div>
						</div>
					</Link>
				))}
			</div>

			<div className="mt-8">
				<h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
				<div className="flex flex-wrap gap-3">
					{[
						{ href: "/dashboard/posts/new", icon: FileText, label: "New Post" },
						{ href: "/dashboard/books/new", icon: BookOpen, label: "New Book" },
						{ href: "/dashboard/papers/new", icon: GraduationCap, label: "New Paper" },
						{ href: "/dashboard/gallery", icon: Image, label: "Upload Images" },
					].map(({ href, icon: Icon, label }) => (
						<Link key={href} href={href} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
							<Icon className="h-4 w-4" />{label}
						</Link>
					))}
				</div>
			</div>
		</div>
	)
}