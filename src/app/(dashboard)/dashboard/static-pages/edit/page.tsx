"use client"

import StaticPageForm from "@/components/static-pages/StaticPageForm"
import { useStaticPage } from "@/lib/queries/static-pages"
import EditRoute, { EditRouteSpinner } from "@/components/layout/EditRoute"

export default function EditStaticPagePage() {
	return <EditRoute>{(id) => <EditStaticPage id={id} />}</EditRoute>
}

function EditStaticPage({ id }: { id: string }) {
	const { data: page, isLoading } = useStaticPage(id)
	if (isLoading) return <EditRouteSpinner />
	if (!page) return <p className="text-gray-500">لم يتم العثور على الصفحة.</p>
	return <div><h1 className="text-3xl font-bold text-gray-900 mb-6">تعديل الصفحة</h1><StaticPageForm page={page} /></div>
}
