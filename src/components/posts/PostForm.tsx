"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { postsService } from "@/services/posts.service"
import type { Post, PostCategory } from "@/types"
import { toast } from "sonner"
import { Loader2, Plus, Trash2, Globe } from "lucide-react"

const translationSchema = z.object({
	lang: z.string().min(2),
	title: z.string().min(1, "Title is required"),
	summary: z.string().optional(),
	body: z.string().min(1, "Content is required"),
	slug: z.string().min(1, "Slug is required"),
	is_default: z.boolean(),
})

const postFormSchema = z.object({
	category_id: z.string().min(1, "Category is required"),
	cover_image_id: z.string().optional(),
	is_published: z.boolean(),
	published_at: z.string().optional(),
	translations: z.array(translationSchema).min(1, "At least one translation required"),
})

type PostFormData = z.infer<typeof postFormSchema>

export default function PostForm({ post }: { post?: Post }) {
	const router = useRouter()
	const [isSaving, setIsSaving] = useState(false)
	const [categories, setCategories] = useState<PostCategory[]>([])
	const [loadingCats, setLoadingCats] = useState(true)
	const [activeLang, setActiveLang] = useState("en")

	const { register, handleSubmit, control, watch, setValue, formState: { errors } } =
		useForm<PostFormData>({
			resolver: zodResolver(postFormSchema),
			defaultValues: post
				? {
					category_id: post.category_id,
					cover_image_id: post.cover_image_id ?? undefined,
					is_published: post.is_published,
					published_at: post.published_at
						? new Date(post.published_at).toISOString().slice(0, 16)
						: undefined,
					translations: post.translations.map((t) => ({
						lang: t.lang,
						title: t.title,
						summary: t.summary ?? undefined,
						body: t.body,
						slug: t.slug,
						is_default: t.is_default,
					})),
				}
				: {
					category_id: "",
					is_published: false,
					translations: [{ lang: "en", title: "", summary: "", body: "", slug: "", is_default: true }],
				},
		})

	const { fields, append, remove } = useFieldArray({ control, name: "translations" })
	const translations = watch("translations")

	useEffect(() => {
		postsService.listCategories()
			.then(({ data }) => setCategories(data.categories))
			.catch(() => toast.error("Failed to load categories"))
			.finally(() => setLoadingCats(false))
	}, [])

	const generateSlug = (title: string) =>
		title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 50)

	const handleTitleChange = (index: number, value: string) => {
		const current = translations[index]?.slug
		if (!current || current === generateSlug(translations[index]?.title || "")) {
			setValue(`translations.${index}.slug`, generateSlug(value))
		}
	}

	const addTranslation = () => {
		const used = translations.map((t) => t.lang)
		const available = ["en", "ar", "fr", "es", "de"].filter((l) => !used.includes(l))
		if (!available.length) { toast.error("No more languages available"); return }
		append({ lang: available[0], title: "", summary: "", body: "", slug: "", is_default: false })
		setActiveLang(available[0])
	}

	const onSubmit = async (data: PostFormData) => {
		setIsSaving(true)
		try {
			if (post) {
				await postsService.update(post.id, data)
				toast.success("Post updated")
			} else {
				await postsService.create(data as Parameters<typeof postsService.create>[0])
				toast.success("Post created")
			}
			router.push("/dashboard/posts")
			router.refresh()
		} catch {
			toast.error("Failed to save post")
		} finally {
			setIsSaving(false)
		}
	}

	if (loadingCats) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
			{/* Basic Settings */}
			<div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
				<h3 className="text-lg font-medium text-gray-900">Basic Settings</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label className="block text-sm font-medium text-gray-700">Category *</label>
						<select {...register("category_id")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary">
							<option value="">Select a category</option>
							{categories.map((cat) => (
								<option key={cat.id} value={cat.id}>
									{cat.translations.find((t) => t.lang === "en")?.title || cat.translations[0]?.title || "Untitled"}
								</option>
							))}
						</select>
						{errors.category_id && <p className="mt-1 text-sm text-red-600">{errors.category_id.message}</p>}
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700">Cover Image ID</label>
						<input {...register("cover_image_id")} placeholder="Media record UUID" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
					</div>
				</div>
				<div className="flex flex-wrap gap-6">
					<label className="flex items-center gap-2">
						<input type="checkbox" {...register("is_published")} className="h-4 w-4 text-primary rounded" />
						<span className="text-sm text-gray-900">Published</span>
					</label>
					{watch("is_published") && (
						<div>
							<label className="block text-sm font-medium text-gray-700">Publish Date</label>
							<input type="datetime-local" {...register("published_at")} className="mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
						</div>
					)}
				</div>
			</div>

			{/* Translations */}
			<div className="bg-white shadow-sm rounded-lg p-6">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-medium text-gray-900">Translations</h3>
					<button type="button" onClick={addTranslation} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/5">
						<Plus className="h-4 w-4" /> Add Language
					</button>
				</div>

				<div className="flex gap-2 mb-6 border-b border-gray-200">
					{fields.map((field, index) => (
						<button key={field.id} type="button" onClick={() => setActiveLang(translations[index]?.lang)}
							className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeLang === translations[index]?.lang ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
							<Globe className="inline h-4 w-4 mr-1" />
							{translations[index]?.lang.toUpperCase()}
							{translations[index]?.is_default && <span className="ml-1 text-xs text-gray-400">(Default)</span>}
							{fields.length > 1 && (
								<span onClick={(e) => { e.stopPropagation(); remove(index); if (activeLang === translations[index]?.lang) setActiveLang(translations[0]?.lang) }}
									className="ml-2 text-gray-400 hover:text-red-500">
									<Trash2 className="inline h-3 w-3" />
								</span>
							)}
						</button>
					))}
				</div>

				{fields.map((field, index) => (
					<div key={field.id} className={activeLang === translations[index]?.lang ? "block" : "hidden"}>
						<div className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700">Language *</label>
									<select {...register(`translations.${index}.lang`)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary">
										<option value="en">English</option>
										<option value="ar">Arabic</option>
										<option value="fr">French</option>
										<option value="es">Spanish</option>
										<option value="de">German</option>
									</select>
								</div>
								<div className="flex items-end">
									<label className="flex items-center gap-2">
										<input type="checkbox" {...register(`translations.${index}.is_default`)}
											onChange={(e) => { if (e.target.checked) fields.forEach((_, i) => { if (i !== index) setValue(`translations.${i}.is_default`, false) }) }}
											className="h-4 w-4 text-primary rounded" />
										<span className="text-sm text-gray-900">Default Language</span>
									</label>
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700">Title *</label>
								<input {...register(`translations.${index}.title`, { onChange: (e) => handleTitleChange(index, e.target.value) })}
									className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
								{errors.translations?.[index]?.title && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.title?.message}</p>}
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700">Slug *</label>
								<input {...register(`translations.${index}.slug`)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
								{errors.translations?.[index]?.slug && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.slug?.message}</p>}
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700">Summary</label>
								<textarea {...register(`translations.${index}.summary`)} rows={3}
									className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700">Content *</label>
								<textarea {...register(`translations.${index}.body`)} rows={12}
									className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary font-mono text-sm"
									placeholder="Markdown supported..." />
								{errors.translations?.[index]?.body && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.body?.message}</p>}
							</div>
						</div>
					</div>
				))}
			</div>

			<div className="flex gap-3">
				<button type="submit" disabled={isSaving}
					className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-medium rounded-md hover:bg-primary/90 disabled:opacity-50">
					{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
					{isSaving ? "Saving..." : post ? "Update Post" : "Create Post"}
				</button>
				<button type="button" onClick={() => router.push("/dashboard/posts")} disabled={isSaving}
					className="px-6 py-2.5 border border-gray-300 font-medium rounded-md text-gray-700 hover:bg-gray-50">
					Cancel
				</button>
			</div>
		</form>
	)
}