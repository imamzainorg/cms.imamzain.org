import PostForm from "@/components/posts/PostForm"

export default function NewPostPage() {
	return (
		<div>
			<h1 className="text-3xl font-bold text-gray-900 mb-6">مقالة جديدة</h1>
			<PostForm />
		</div>
	)
}