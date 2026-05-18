"use client"

import { Trash2 } from "lucide-react"
import { booksService } from "@/services/books.service"
import { queryKeys } from "@/lib/queries/keys"
import { pickTranslation } from "@/lib/i18n"
import type { Book } from "@/types"
import TrashList from "@/components/trash/TrashList"

export default function BooksTrashPage() {
	return (
		<TrashList<Book>
			title="سلة المهملات — الكتب"
			description="الكتب المحذوفة. يُستعاد رقم ISBN إن لم يكن مأخوذاً من قبل كتاب آخر."
			singular="الكتاب"
			icon={Trash2}
			backHref="/dashboard/books"
			backLabel="العودة إلى المكتبة"
			resource="books"
			rootKey={queryKeys.books.all}
			service={{ trash: booksService.trash, restore: booksService.restore }}
			getId={(b) => b.id}
			getCreatedAt={(b) => b.created_at}
			getLabel={(b) => pickTranslation(b.book_translations, b.translation)?.title || "بدون عنوان"}
			getSubtitle={(b) => pickTranslation(b.book_translations, b.translation)?.author || null}
			getThumbnailUrl={(b) => b.media?.url ?? null}
		/>
	)
}
