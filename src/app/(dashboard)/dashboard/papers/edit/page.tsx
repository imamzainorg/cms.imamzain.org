"use client"

import PaperForm from "@/components/papers/PaperForm"
import { usePaper } from "@/lib/queries/papers"
import EditRoute, { EditRouteSpinner } from "@/components/layout/EditRoute"

export default function EditPaperPage() {
	return <EditRoute>{(id) => <EditPaper id={id} />}</EditRoute>
}

function EditPaper({ id }: { id: string }) {
	const { data: paper, isLoading } = usePaper(id)
	if (isLoading) return <EditRouteSpinner />
	if (!paper) return <p className="text-gray-500">لم يتم العثور على البحث.</p>
	return <div><h1 className="text-3xl font-bold text-gray-900 mb-6">تعديل البحث</h1><PaperForm paper={paper} /></div>
}
