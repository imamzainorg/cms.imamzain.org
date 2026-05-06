"use client"

import { useEffect, useState } from "react"
import { use } from "react"
import { postsService } from "@/services/posts.service"
import type { Post } from "@/types"
import PostForm from "@/components/posts/PostForm"
import { Loader2 } from "lucide-react"

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const [post, setPost] = useState<Post | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		postsService.get(id)
			.then(({ data }) => setPost(data))
			.catch(console.error)
			.finally(() => setIsLoading(false))
	}, [id])

	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
	if (!post) return <p className="text-gray-500">لم يتم العثور على المقالة.</p>

	return (
		<div>
			<h1 className="text-3xl font-bold text-gray-900 mb-6">تعديل المقالة</h1>
			<PostForm post={post} />
		</div>
	)
}