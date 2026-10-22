"use client"

import { Trash2 } from "lucide-react"
import { postsService } from "@/services/posts.service"
import { queryKeys } from "@/lib/queries/keys"
import { pickTranslation } from "@/lib/i18n"
import type { Post } from "@/types"
import TrashList from "@/components/trash/TrashList"

export default function PostsTrashPage() {
	return (
		<TrashList<Post>
			title="سلة المهملات — الأخبار"
			description="الأخبار المحذوفة. الروابط المختصرة تُستعاد إن لم تكن مأخوذة من قبل خبر آخر."
			singular="الخبر"
			icon={Trash2}
			backHref="/dashboard/posts"
			backLabel="العودة إلى الأخبار"
			resource="posts"
			rootKey={queryKeys.posts.all}
			service={{ trash: postsService.trash, restore: postsService.restore }}
			getId={(p) => p.id}
			getCreatedAt={(p) => p.created_at}
			getLabel={(p) => pickTranslation(p.post_translations, p.translation)?.title || "بدون عنوان"}
			getSubtitle={(p) => `${p.post_translations?.length ?? 1} ترجمة`}
			getThumbnailUrl={(p) => p.media?.url ?? null}
		/>
	)
}
