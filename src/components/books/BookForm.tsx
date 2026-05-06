"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { booksService } from "@/services/books.service"
import type { Book, BookCategory } from "@/types"
import { toast } from "sonner"
import { Loader2, Plus, Trash2, Globe } from "lucide-react"

const translationSchema = z.object({
	lang: z.string().min(2),
	title: z.string().min(1, "العنوان مطلوب"),
	author: z.string().optional(),
	publisher: z.string().optional(),
	description: z.string().optional(),
	series: z.string().optional(),
	is_default: z.boolean(),
})

const bookFormSchema = z.object({
	category_id: z.string().min(1, "التصنيف مطلوب"),
	cover_image_id: z.string().optional(),
	isbn: z.string().optional(),
	pages: z.number().optional(),
	publish_year: z.string().optional(),
	part_number: z.number().optional(),
	parts: z.number().optional(),
	translations: z.array(translationSchema).min(1),
})

type BookFormData = z.infer<typeof bookFormSchema>

export default function BookForm({ book }: { book?: Book }) {
	const router = useRouter()
	const [isSaving, setIsSaving] = useState(false)
	const [categories, setCategories] = useState<BookCategory[]>([])
	const [loadingCats, setLoadingCats] = useState(true)
	const [activeLang, setActiveLang] = useState("ar")

	const { register, handleSubmit, control, watch, setValue, formState: { errors } } =
		useForm<BookFormData>({
			resolver: zodResolver(bookFormSchema),
			defaultValues: book
				? {
					category_id: book.category_id ?? "",
					cover_image_id: book.cover_image_id ?? undefined,
					isbn: book.isbn ?? "",
					pages: book.pages ?? undefined,
					publish_year: book.publish_year ?? "",
					part_number: book.part_number ?? undefined,
					parts: book.parts ?? undefined,
					translations: (book.book_translations ?? []).map((t) => ({
						lang: t.lang,
						title: t.title,
						author: t.author ?? undefined,
						publisher: t.publisher ?? undefined,
						description: t.description ?? undefined,
						series: t.series ?? undefined,
						is_default: t.is_default,
					})),
				}
				: {
					category_id: "",
					publish_year: String(new Date().getFullYear()),
					translations: [{ lang: "ar", title: "", author: "", publisher: "", description: "", series: "", is_default: true }],
				},
		})

	const { fields, append, remove } = useFieldArray({ control, name: "translations" })
	const translations = watch("translations")

	useEffect(() => {
		booksService.listCategories()
			.then(({ data }) => setCategories(data.items))
			.catch(() => toast.error("فشل تحميل التصنيفات"))
			.finally(() => setLoadingCats(false))
	}, [])

	const addTranslation = () => {
		const used = translations.map((t) => t.lang)
		const available = ["ar", "en", "fr", "es", "de"].filter((l) => !used.includes(l))
		if (!available.length) { toast.error("لا توجد لغات إضافية متاحة"); return }
		append({ lang: available[0], title: "", author: "", publisher: "", description: "", series: "", is_default: false })
		setActiveLang(available[0])
	}

	const onSubmit = async (data: BookFormData) => {
		setIsSaving(true)
		try {
			if (book) {
				await booksService.update(book.id, data)
				toast.success("تم تحديث الكتاب")
			} else {
				await booksService.create(data as Parameters<typeof booksService.create>[0])
				toast.success("تم إنشاء الكتاب")
			}
			router.push("/dashboard/books")
			router.refresh()
		} catch {
			toast.error("فشل حفظ الكتاب")
		} finally {
			setIsSaving(false)
		}
	}

	if (loadingCats) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
			<div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
				<h3 className="text-lg font-medium text-gray-900">المعلومات الأساسية</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label className="block text-sm font-medium text-gray-700">التصنيف *</label>
						<select {...register("category_id")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary">
							<option value="">اختر تصنيفاً</option>
							{categories.map((cat) => (
								<option key={cat.id} value={cat.id}>
									{cat.book_category_translations.find((t) => t.lang === "ar")?.name ||
										cat.book_category_translations[0]?.name || "بدون اسم"}
								</option>
							))}
						</select>
						{errors.category_id && <p className="mt-1 text-sm text-red-600">{errors.category_id.message}</p>}
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700">معرّف صورة الغلاف</label>
						<input {...register("cover_image_id")} placeholder="UUID لسجل الوسائط" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700">ISBN</label>
						<input {...register("isbn")} dir="ltr" placeholder="978-3-16-148410-0" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700">سنة النشر</label>
						<input type="number" {...register("publish_year")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700">عدد الصفحات</label>
						<input type="number" {...register("pages", { valueAsNumber: true })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700">رقم الجزء</label>
							<input type="number" {...register("part_number", { valueAsNumber: true })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">إجمالي الأجزاء</label>
							<input type="number" {...register("parts", { valueAsNumber: true })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
						</div>
					</div>
				</div>
			</div>

			<div className="bg-white shadow-sm rounded-lg p-6">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-medium text-gray-900">الترجمات</h3>
					<button type="button" onClick={addTranslation} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/5">
						<Plus className="h-4 w-4" /> إضافة لغة
					</button>
				</div>
				<div className="flex gap-2 mb-6 border-b border-gray-200">
					{fields.map((field, index) => (
						<button key={field.id} type="button" onClick={() => setActiveLang(translations[index]?.lang)}
							className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeLang === translations[index]?.lang ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
							<Globe className="inline h-4 w-4 mr-1" />{translations[index]?.lang.toUpperCase()}
							{translations[index]?.is_default && <span className="ml-1 text-xs text-gray-400">(الافتراضية)</span>}
							{fields.length > 1 && <span onClick={(e) => { e.stopPropagation(); remove(index); if (activeLang === translations[index]?.lang) setActiveLang(translations[0]?.lang) }} className="ml-2 text-gray-400 hover:text-red-500"><Trash2 className="inline h-3 w-3" /></span>}
						</button>
					))}
				</div>
				{fields.map((field, index) => (
					<div key={field.id} className={activeLang === translations[index]?.lang ? "block space-y-4" : "hidden"}>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700">اللغة *</label>
								<select {...register(`translations.${index}.lang`)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary">
									<option value="ar">العربية</option><option value="en">الإنجليزية</option><option value="fr">الفرنسية</option><option value="es">الإسبانية</option><option value="de">الألمانية</option>
								</select>
							</div>
							<div className="flex items-end">
								<label className="flex items-center gap-2">
									<input type="checkbox" {...register(`translations.${index}.is_default`)} onChange={(e) => { if (e.target.checked) fields.forEach((_, i) => { if (i !== index) setValue(`translations.${i}.is_default`, false) }) }} className="h-4 w-4 text-primary rounded" />
									<span className="text-sm">اللغة الافتراضية</span>
								</label>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">العنوان *</label>
							<input {...register(`translations.${index}.title`)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
							{errors.translations?.[index]?.title && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.title?.message}</p>}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">المؤلف</label>
							<input {...register(`translations.${index}.author`)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">دار النشر</label>
							<input {...register(`translations.${index}.publisher`)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">السلسلة</label>
							<input {...register(`translations.${index}.series`)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">الوصف</label>
							<textarea {...register(`translations.${index}.description`)} rows={4} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
						</div>
					</div>
				))}
			</div>

			<div className="flex gap-3">
				<button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-medium rounded-md hover:bg-primary/90 disabled:opacity-50">
					{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{isSaving ? "جارٍ الحفظ..." : book ? "تحديث الكتاب" : "إنشاء كتاب"}
				</button>
				<button type="button" onClick={() => router.push("/dashboard/books")} disabled={isSaving} className="px-6 py-2.5 border border-gray-300 font-medium rounded-md text-gray-700 hover:bg-gray-50">إلغاء</button>
			</div>
		</form>
	)
}
