"use client"

import { use } from "react"
import { usePost } from "@/lib/queries/posts"
import PostForm from "@/components/posts/PostForm"
import AuditPanel from "@/components/audit/AuditPanel"
import { Loader2 } from "lucide-react"

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const { data: post, isLoading } = usePost(id)

	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
	if (!post) return <p className="text-gray-500">لم يتم العثور على المقالة.</p>

	return (
		<div>
			<h1 className="text-3xl font-bold text-gray-900 mb-6">تعديل المقالة</h1>
			<PostForm post={post} />
			<div className="mt-6">
				<AuditPanel resource_type="post" resource_id={post.id} />
			</div>
		</div>
	)
}
