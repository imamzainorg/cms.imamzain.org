"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { papersService } from "@/services/papers.service"
import type { AcademicPaper, AcademicPaperCategory } from "@/types"
import { toast } from "sonner"
import { Loader2, Plus, Trash2, Globe } from "lucide-react"

const translationSchema = z.object({
	lang: z.string().min(2),
	title: z.string().min(1, "Title is required"),
	abstract: z.string().optional(),
	authors: z.array(z.string()).min(1, "At least one author required"),
	keywords: z.array(z.string()),
	publication_venue: z.string().optional(),
	page_count: z.number().optional(),
	is_default: z.boolean(),
})

const paperFormSchema = z.object({
	category_id: z.string().min(1, "Category is required"),
	published_year: z.string().optional(),
	pdf_url: z.string().optional(),
	translations: z.array(translationSchema).min(1),
})

type PaperFormData = z.infer<typeof paperFormSchema>

export default function PaperForm({ paper }: { paper?: AcademicPaper }) {
	const router = useRouter()
	const [isSaving, setIsSaving] = useState(false)
	const [categories, setCategories] = useState<AcademicPaperCategory[]>([])
	const [loadingCats, setLoadingCats] = useState(true)
	const [activeLang, setActiveLang] = useState("en")
	const [newAuthor, setNewAuthor] = useState("")
	const [newKeyword, setNewKeyword] = useState("")

	const { register, handleSubmit, control, watch, setValue, formState: { errors } } =
		useForm<PaperFormData>({
			resolver: zodResolver(paperFormSchema),
			defaultValues: paper
				? {
					category_id: paper.category_id,
					published_year: paper.published_year ?? "",
					pdf_url: paper.pdf_url ?? "",
					translations: paper.translations.map((t) => ({
						lang: t.lang, title: t.title,
						abstract: t.abstract ?? undefined,
						authors: t.authors,
						keywords: t.keywords,
						publication_venue: t.publication_venue ?? undefined,
						page_count: t.page_count ?? undefined,
						is_default: t.is_default,
					})),
				}
				: {
					category_id: "",
					published_year: String(new Date().getFullYear()),
					translations: [{ lang: "en", title: "", abstract: "", authors: [], keywords: [], publication_venue: "", page_count: undefined, is_default: true }],
				},
		})

	const { fields, append, remove } = useFieldArray({ control, name: "translations" })
	const translations = watch("translations")

	useEffect(() => {
		papersService.listCategories()
			.then(({ data }) => setCategories(data.categories))
			.catch(() => toast.error("Failed to load categories"))
			.finally(() => setLoadingCats(false))
	}, [])

	const addTranslation = () => {
		const used = translations.map((t) => t.lang)
		const available = ["en", "ar", "fr", "es", "de"].filter((l) => !used.includes(l))
		if (!available.length) { toast.error("No more languages available"); return }
		append({ lang: available[0], title: "", abstract: "", authors: [], keywords: [], publication_venue: "", page_count: undefined, is_default: false })
		setActiveLang(available[0])
	}

	const addAuthor = (index: number) => {
		if (!newAuthor.trim()) return
		setValue(`translations.${index}.authors`, [...(translations[index]?.authors || []), newAuthor.trim()])
		setNewAuthor("")
	}
	const removeAuthor = (i: number, ai: number) =>
		setValue(`translations.${i}.authors`, translations[i]?.authors.filter((_, idx) => idx !== ai))

	const addKeyword = (index: number) => {
		if (!newKeyword.trim()) return
		const curr = translations[index]?.keywords || []
		if (curr.includes(newKeyword.trim())) { toast.error("Keyword already exists"); return }
		setValue(`translations.${index}.keywords`, [...curr, newKeyword.trim()])
		setNewKeyword("")
	}
	const removeKeyword = (i: number, ki: number) =>
		setValue(`translations.${i}.keywords`, translations[i]?.keywords.filter((_, idx) => idx !== ki))

	const onSubmit = async (data: PaperFormData) => {
		setIsSaving(true)
		try {
			if (paper) {
				await papersService.update(paper.id, data)
				toast.success("Paper updated")
			} else {
				await papersService.create(data as Parameters<typeof papersService.create>[0])
				toast.success("Paper created")
			}
			router.push("/dashboard/papers")
			router.refresh()
		} catch { toast.error("Failed to save paper") }
		finally { setIsSaving(false) }
	}

	if (loadingCats) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
			<div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
				<h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
						<label className="block text-sm font-medium text-gray-700">Published Year</label>
						<input type="number" {...register("published_year")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700">PDF URL</label>
						<input {...register("pdf_url")} placeholder="https://..." className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
					</div>
				</div>
			</div>

			<div className="bg-white shadow-sm rounded-lg p-6">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-medium text-gray-900">Translations</h3>
					<button type="button" onClick={addTranslation} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/5"><Plus className="h-4 w-4" />Add Language</button>
				</div>
				<div className="flex gap-2 mb-6 border-b border-gray-200">
					{fields.map((field, index) => (
						<button key={field.id} type="button" onClick={() => setActiveLang(translations[index]?.lang)}
							className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeLang === translations[index]?.lang ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
							<Globe className="inline h-4 w-4 mr-1" />{translations[index]?.lang.toUpperCase()}
							{translations[index]?.is_default && <span className="ml-1 text-xs text-gray-400">(Default)</span>}
							{fields.length > 1 && <span onClick={(e) => { e.stopPropagation(); remove(index); if (activeLang === translations[index]?.lang) setActiveLang(translations[0]?.lang) }} className="ml-2 text-gray-400 hover:text-red-500"><Trash2 className="inline h-3 w-3" /></span>}
						</button>
					))}
				</div>
				{fields.map((field, index) => (
					<div key={field.id} className={activeLang === translations[index]?.lang ? "block space-y-4" : "hidden"}>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700">Language *</label>
								<select {...register(`translations.${index}.lang`)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary">
									<option value="en">English</option><option value="ar">Arabic</option><option value="fr">French</option><option value="es">Spanish</option><option value="de">German</option>
								</select>
							</div>
							<div className="flex items-end">
								<label className="flex items-center gap-2">
									<input type="checkbox" {...register(`translations.${index}.is_default`)} onChange={(e) => { if (e.target.checked) fields.forEach((_, i) => { if (i !== index) setValue(`translations.${i}.is_default`, false) }) }} className="h-4 w-4 text-primary rounded" />
									<span className="text-sm">Default Language</span>
								</label>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">Title *</label>
							<input {...register(`translations.${index}.title`)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
							{errors.translations?.[index]?.title && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.title?.message}</p>}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">Abstract</label>
							<textarea {...register(`translations.${index}.abstract`)} rows={4} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">Authors *</label>
							<div className="flex gap-2 mt-1">
								<input value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAuthor(index) } }} placeholder="Add author, press Enter" className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
								<button type="button" onClick={() => addAuthor(index)} className="px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200"><Plus className="h-4 w-4" /></button>
							</div>
							<div className="mt-2 flex flex-wrap gap-2">
								{translations[index]?.authors?.map((a, ai) => (
									<span key={ai} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
										{a}<button type="button" onClick={() => removeAuthor(index, ai)} className="text-gray-500 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
									</span>
								))}
							</div>
							{errors.translations?.[index]?.authors && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.authors?.message}</p>}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">Keywords</label>
							<div className="flex gap-2 mt-1">
								<input value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(index) } }} placeholder="Add keyword, press Enter" className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
								<button type="button" onClick={() => addKeyword(index)} className="px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200"><Plus className="h-4 w-4" /></button>
							</div>
							<div className="mt-2 flex flex-wrap gap-2">
								{translations[index]?.keywords?.map((k, ki) => (
									<span key={ki} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
										{k}<button type="button" onClick={() => removeKeyword(index, ki)} className="text-blue-500 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
									</span>
								))}
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700">Publication Venue</label>
								<input {...register(`translations.${index}.publication_venue`)} placeholder="Journal / conference" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700">Page Count</label>
								<input type="number" {...register(`translations.${index}.page_count`, { valueAsNumber: true })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
							</div>
						</div>
					</div>
				))}
			</div>

			<div className="flex gap-3">
				<button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-medium rounded-md hover:bg-primary/90 disabled:opacity-50">
					{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{isSaving ? "Saving..." : paper ? "Update Paper" : "Create Paper"}
				</button>
				<button type="button" onClick={() => router.push("/dashboard/papers")} disabled={isSaving} className="px-6 py-2.5 border border-gray-300 font-medium rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
			</div>
		</form>
	)
}