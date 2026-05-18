"use client"
import { use } from "react"
import BookForm from "@/components/books/BookForm"
import { useBook } from "@/lib/queries/books"
import { Loader2 } from "lucide-react"

export default function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const { data: book, isLoading } = useBook(id)
	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
	if (!book) return <p className="text-gray-500">لم يتم العثور على الكتاب.</p>
	return <div><h1 className="text-3xl font-bold text-gray-900 mb-6">تعديل الكتاب</h1><BookForm book={book} /></div>
}
