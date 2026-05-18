"use client"

import CategoryManager from "@/components/categories/CategoryManager"
import { bookCategoriesService } from "@/services/book-categories.service"
import { queryKeys } from "@/lib/queries/keys"
import type { BookCategory } from "@/types"

export default function BookCategoriesPage() {
	return (
		<CategoryManager<BookCategory>
			title="تصنيفات الكتب"
			singular="تصنيف"
			service={bookCategoriesService}
			queryKey={queryKeys.bookCategories.all}
			translationsField="book_category_translations"
			trashHref="/dashboard/book-categories/trash"
		/>
	)
}
