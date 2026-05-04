"use client"
import { useEffect, useState } from "react"
import { use } from "react"
import { booksService } from "@/services/books.service"
import type { Book } from "@/types"
import BookForm from "@/components/books/BookForm"
import { Loader2 } from "lucide-react"
export default function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const [book, setBook] = useState<Book | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	useEffect(() => { booksService.get(id).then(({ data }) => setBook(data)).catch(console.error).finally(() => setIsLoading(false)) }, [id])
	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
	if (!book) return <p className="text-gray-500">Book not found.</p>
	return <div><h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Book</h1><BookForm book={book} /></div>
}