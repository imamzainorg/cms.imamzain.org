"use client"
import { useEffect, useState } from "react"
import { use } from "react"
import { papersService } from "@/services/papers.service"
import type { AcademicPaper } from "@/types"
import PaperForm from "@/components/papers/PaperForm"
import { Loader2 } from "lucide-react"
export default function EditPaperPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const [paper, setPaper] = useState<AcademicPaper | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	useEffect(() => { papersService.get(id).then(({ data }) => setPaper(data)).catch(console.error).finally(() => setIsLoading(false)) }, [id])
	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
	if (!paper) return <p className="text-gray-500">لم يتم العثور على البحث.</p>
	return <div><h1 className="text-3xl font-bold text-gray-900 mb-6">تعديل البحث</h1><PaperForm paper={paper} /></div>
}