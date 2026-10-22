import { Suspense } from "react"
import BookForm from "@/components/books/BookForm"
import { EditRouteSpinner } from "@/components/layout/EditRoute"

// BookForm reads ?parent_id= (the "add a volume" link), which needs a Suspense
// boundary in a static export.
export default function NewBookPage() {
	return (
		<div>
			<h1 className="text-3xl font-bold text-gray-900 mb-6">كتاب جديد</h1>
			<Suspense fallback={<EditRouteSpinner />}>
				<BookForm />
			</Suspense>
		</div>
	)
}