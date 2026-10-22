"use client"

import { usePost } from "@/lib/queries/posts"
import PostForm from "@/components/posts/PostForm"
import AuditPanel from "@/components/audit/AuditPanel"
import EditRoute, { EditRouteSpinner } from "@/components/layout/EditRoute"

export default function EditPostPage() {
	return <EditRoute>{(id) => <EditPost id={id} />}</EditRoute>
}

function EditPost({ id }: { id: string }) {
	const { data: post, isLoading } = usePost(id)

	if (isLoading) return <EditRouteSpinner />
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
