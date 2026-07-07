"use client"
import { use } from "react"
import StaticPageForm from "@/components/static-pages/StaticPageForm"
import { useStaticPage } from "@/lib/queries/static-pages"
import { Loader2 } from "lucide-react"

export default function EditStaticPagePage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const { data: page, isLoading } = useStaticPage(id)
	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
	if (!page) return <p className="text-gray-500">لم يتم العثور على الصفحة.</p>
	return <div><h1 className="text-3xl font-bold text-gray-900 mb-6">تعديل الصفحة</h1><StaticPageForm page={page} /></div>
}
