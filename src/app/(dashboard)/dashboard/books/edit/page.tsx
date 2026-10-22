"use client"

import BookForm from "@/components/books/BookForm"
import { useBook } from "@/lib/queries/books"
import EditRoute, { EditRouteSpinner } from "@/components/layout/EditRoute"

export default function EditBookPage() {
	return <EditRoute>{(id) => <EditBook id={id} />}</EditRoute>
}

function EditBook({ id }: { id: string }) {
	const { data: book, isLoading } = useBook(id)
	if (isLoading) return <EditRouteSpinner />
	if (!book) return <p className="text-gray-500">لم يتم العثور على الكتاب.</p>
	return <div><h1 className="text-3xl font-bold text-gray-900 mb-6">تعديل الكتاب</h1><BookForm book={book} /></div>
}
