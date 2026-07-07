"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Audio, SpeakerTranslationItem } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { pickTranslation } from "@/lib/i18n"
import { toArabicDigits } from "@/lib/dates"
import { useActiveLanguages, languageLabel } from "@/lib/useLanguages"
import { extractAudioMeta } from "@/lib/audio-meta"
import { audiosService } from "@/services/audios.service"
import { useCreateAudio, useUpdateAudio } from "@/lib/queries/audios"
import { useSpeakersList, useCreateSpeaker } from "@/lib/queries/speakers"
import { useTranslationsField } from "@/lib/use-translations-field"
import Modal from "@/components/ui/Modal"
import TranslationTabs, { pickTranslationsOrEmpty } from "@/components/forms/TranslationTabs"
import { FileAudio, FileText, Globe, Loader2, Plus, Trash2, UploadCloud } from "lucide-react"

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const HTTP_URL_RE = /^https?:\/\/.+/i

const translationSchema = z.object({
	lang: z.string().min(2),
	title: z.string().min(1, "العنوان مطلوب").max(500, "العنوان طويل جداً"),
	is_default: z.boolean(),
})

const audioFormSchema = z.object({
	speaker_id: z.string().optional(),
	audio_url: z.string()
		.min(1, "الملف الصوتي مطلوب — ارفع ملفاً أو ألصق رابطاً")
		.max(2000)
		.regex(HTTP_URL_RE, "يجب أن يكون رابطاً يبدأ بـ http أو https"),
	pdf_url: z.string()
		.max(2000)
		.regex(HTTP_URL_RE, "يجب أن يكون رابطاً يبدأ بـ http أو https")
		.optional()
		.or(z.literal("")),
	slug: z.string()
		.max(200)
		.regex(SLUG_RE, "أحرف لاتينية صغيرة وأرقام وشرطات فقط (مثال: lecture-imam-sajjad)")
		.optional()
		.or(z.literal("")),
	is_published: z.boolean(),
	duration_seconds: z.number().int().min(0).optional(),
	size_mb: z.number().min(0).optional(),
	peaks: z.array(z.number()).optional(),
	translations: z.array(translationSchema).min(1),
})

type AudioFormData = z.infer<typeof audioFormSchema>

function formatDuration(secs: number | null | undefined): string {
	if (secs === null || secs === undefined || !Number.isFinite(secs)) return "—"
	const m = Math.floor(secs / 60)
	const s = Math.floor(secs % 60)
	return toArabicDigits(`${m}:${String(s).padStart(2, "0")}`)
}

export default function AudioForm({ audio }: { audio?: Audio }) {
	const router = useRouter()
	const { languages } = useActiveLanguages()
	const createAudio = useCreateAudio()
	const updateAudio = useUpdateAudio()
	const isSaving = createAudio.isPending || updateAudio.isPending
	const [activeLang, setActiveLang] = useState("ar")

	// Upload state — audio file
	const audioFileRef = useRef<HTMLInputElement>(null)
	const [audioFileName, setAudioFileName] = useState<string | null>(null)
	const [analyzing, setAnalyzing] = useState(false)
	const [uploadingAudio, setUploadingAudio] = useState(false)

	// Upload state — companion PDF
	const pdfFileRef = useRef<HTMLInputElement>(null)
	const [pdfFileName, setPdfFileName] = useState<string | null>(null)
	const [uploadingPdf, setUploadingPdf] = useState(false)

	const [speakerModalOpen, setSpeakerModalOpen] = useState(false)

	const speakersQuery = useSpeakersList({ limit: 100 })
	const speakers = speakersQuery.data?.items ?? []

	const blankTranslation = (lang = "ar", is_default = true) => ({
		lang,
		title: "",
		is_default,
	})

	const buildDefaults = (): AudioFormData => {
		if (!audio) {
			return {
				speaker_id: "",
				audio_url: "",
				pdf_url: "",
				slug: "",
				is_published: true,
				translations: [blankTranslation()],
			}
		}
		const raw = pickTranslationsOrEmpty(audio.audio_translations, audio.translation)
		const translations = raw.length
			? raw.map((t) => ({
				lang: t.lang,
				title: t.title ?? "",
				is_default: t.is_default ?? false,
			}))
			: [blankTranslation()]
		return {
			speaker_id: audio.speaker_id ?? "",
			audio_url: audio.audio_url ?? "",
			pdf_url: audio.pdf_url ?? "",
			slug: audio.slug ?? "",
			is_published: audio.is_published,
			duration_seconds: audio.duration_seconds ?? undefined,
			size_mb: audio.size_mb ?? undefined,
			// peaks intentionally not seeded — not editable; only replaced when a
			// new file is uploaded (server keeps existing peaks otherwise).
			translations,
		}
	}

	const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } =
		useForm<AudioFormData>({
			resolver: zodResolver(audioFormSchema),
			defaultValues: buildDefaults(),
		})

	useEffect(() => {
		if (audio) reset(buildDefaults())
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [audio?.id])

	const { fields, append, remove } = useFieldArray({ control, name: "translations" })
	const translations = watch("translations")
	const audioUrl = watch("audio_url")
	const durationSeconds = watch("duration_seconds")
	const sizeMb = watch("size_mb")

	const addTranslation = () => {
		const used = translations.map((t) => t.lang)
		const next = languages.find((l) => !used.includes(l.code))
		if (!next) { toast.error("لا توجد لغات إضافية متاحة"); return }
		append(blankTranslation(next.code, false))
		setActiveLang(next.code)
	}

	const removeTranslation = (index: number) => {
		const removedLang = translations[index]?.lang
		remove(index)
		if (activeLang === removedLang) {
			const remaining = translations.filter((_, i) => i !== index)
			setActiveLang(remaining[0]?.lang ?? "ar")
		}
	}

	const handleAudioFile = async (file: File) => {
		try {
			// 1. Extract duration / size / peaks locally (non-fatal on failure).
			setAnalyzing(true)
			const meta = await extractAudioMeta(file)
			setAnalyzing(false)

			// 2. Upload to R2 via the pre-signed URL.
			setUploadingAudio(true)
			const { publicUrl } = await audiosService.uploadAudioFile(file, "audio")

			setValue("audio_url", publicUrl, { shouldValidate: true })
			setValue("duration_seconds", meta.durationSeconds || undefined)
			setValue("size_mb", meta.sizeMB || undefined)
			setValue("peaks", meta.peaks.length ? meta.peaks : undefined)
			setAudioFileName(file.name)
			toast.success("تم رفع الملف الصوتي")
		} catch (e) {
			toast.error(getErrorMessage(e, "فشل رفع الملف الصوتي"))
		} finally {
			setAnalyzing(false)
			setUploadingAudio(false)
		}
	}

	const handlePdfFile = async (file: File) => {
		try {
			setUploadingPdf(true)
			const { publicUrl } = await audiosService.uploadAudioFile(file, "pdf")
			setValue("pdf_url", publicUrl, { shouldValidate: true })
			setPdfFileName(file.name)
			toast.success("تم رفع ملف PDF")
		} catch (e) {
			toast.error(getErrorMessage(e, "فشل رفع ملف PDF"))
		} finally {
			setUploadingPdf(false)
		}
	}

	const onSubmit = async (data: AudioFormData) => {
		const defaults = data.translations.filter((t) => t.is_default).length
		if (defaults !== 1) {
			toast.error("يجب اختيار لغة افتراضية واحدة بالضبط")
			return
		}
		const translationsBody = data.translations.map((t) => ({
			lang: t.lang,
			title: t.title,
			is_default: t.is_default,
		}))
		const handlers = {
			onSuccess: () => {
				toast.success(audio ? "تم تحديث التسجيل" : "تم إنشاء التسجيل")
				router.push("/dashboard/audios")
				router.refresh()
			},
			onError: (e: unknown) => toast.error(getErrorMessage(e, "فشل حفظ التسجيل")),
		}
		if (audio) {
			updateAudio.mutate({
				id: audio.id,
				body: {
					// null disconnects the speaker; a uuid reassigns it.
					speaker_id: data.speaker_id || null,
					audio_url: data.audio_url,
					// null clears a previously-saved value (undefined would keep it).
					pdf_url: data.pdf_url || null,
					slug: data.slug || null,
					duration_seconds: data.duration_seconds,
					size_mb: data.size_mb,
					peaks: data.peaks?.length ? data.peaks : undefined,
					is_published: data.is_published,
					translations: translationsBody,
				},
			}, handlers)
		} else {
			createAudio.mutate({
				speaker_id: data.speaker_id || undefined,
				audio_url: data.audio_url,
				pdf_url: data.pdf_url || undefined,
				slug: data.slug || undefined,
				duration_seconds: data.duration_seconds,
				size_mb: data.size_mb,
				peaks: data.peaks?.length ? data.peaks : undefined,
				is_published: data.is_published,
				translations: translationsBody,
			}, handlers)
		}
	}

	const audioBusy = analyzing || uploadingAudio

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<div className="lg:col-span-2 space-y-6">
				{/* (a) الملف الصوتي */}
				<div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 space-y-4">
					<h3 className="text-lg font-medium text-foreground flex items-center gap-2">
						<FileAudio className="h-5 w-5 text-primary" strokeWidth={1.6} />
						الملف الصوتي <span className="text-red-500">*</span>
					</h3>

					<input
						ref={audioFileRef}
						type="file"
						accept=".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a"
						className="hidden"
						onChange={(e) => {
							const f = e.target.files?.[0]
							if (f) handleAudioFile(f)
							e.target.value = ""
						}}
					/>

					<div className="flex flex-wrap items-center gap-3">
						<button
							type="button"
							onClick={() => audioFileRef.current?.click()}
							disabled={audioBusy}
							className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{audioBusy
								? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />
								: <UploadCloud className="h-4 w-4" strokeWidth={1.6} />}
							{analyzing ? "جارٍ تحليل الملف…" : uploadingAudio ? "جارٍ الرفع…" : "رفع ملف (MP3 / M4A)"}
						</button>
						{audioFileName && !audioBusy && (
							<span className="text-sm text-gray-600 truncate max-w-60" dir="ltr">{audioFileName}</span>
						)}
					</div>

					{(durationSeconds !== undefined || sizeMb !== undefined) && (
						<div className="flex flex-wrap gap-4 text-xs text-gray-500">
							<span>المدة: <span className="font-medium text-gray-700">{formatDuration(durationSeconds)}</span></span>
							<span>الحجم: <span className="font-medium text-gray-700">{sizeMb !== undefined ? `${toArabicDigits(String(sizeMb))} م.ب` : "—"}</span></span>
						</div>
					)}

					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">
							أو ألصق رابط ملف مستضاف مسبقاً
						</label>
						<input
							{...register("audio_url")}
							dir="ltr"
							placeholder="https://cdn.imamzain.org/audio/..."
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm font-mono"
						/>
						{errors.audio_url && <p className="mt-1 text-sm text-red-600">{errors.audio_url.message}</p>}
					</div>
					{audioUrl && (
						<audio controls src={audioUrl} className="w-full" preload="none" />
					)}
				</div>

				{/* (b) ملف PDF مرافق */}
				<div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 space-y-4">
					<h3 className="text-lg font-medium text-foreground flex items-center gap-2">
						<FileText className="h-5 w-5 text-primary" strokeWidth={1.6} />
						ملف PDF مرافق <span className="text-xs font-normal text-gray-400">(اختياري)</span>
					</h3>

					<input
						ref={pdfFileRef}
						type="file"
						accept=".pdf,application/pdf"
						className="hidden"
						onChange={(e) => {
							const f = e.target.files?.[0]
							if (f) handlePdfFile(f)
							e.target.value = ""
						}}
					/>

					<div className="flex flex-wrap items-center gap-3">
						<button
							type="button"
							onClick={() => pdfFileRef.current?.click()}
							disabled={uploadingPdf}
							className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{uploadingPdf
								? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />
								: <UploadCloud className="h-4 w-4" strokeWidth={1.6} />}
							{uploadingPdf ? "جارٍ الرفع…" : "رفع ملف PDF"}
						</button>
						{pdfFileName && !uploadingPdf && (
							<span className="text-sm text-gray-600 truncate max-w-60" dir="ltr">{pdfFileName}</span>
						)}
					</div>

					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">
							أو ألصق رابط PDF مباشرة
						</label>
						<input
							{...register("pdf_url")}
							dir="ltr"
							placeholder="https://cdn.imamzain.org/audio/pdf/..."
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm font-mono"
						/>
						{errors.pdf_url && <p className="mt-1 text-sm text-red-600">{errors.pdf_url.message}</p>}
					</div>
				</div>

				{/* (e) الترجمات */}
				<TranslationTabs
					fields={fields}
					translations={translations}
					activeLang={activeLang}
					onChangeActiveLang={(l) => setActiveLang(l)}
					onAdd={addTranslation}
					onRemove={removeTranslation}
					title="عنوان التسجيل"
					renderTranslation={(index) => (
						<>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								<div>
									<label className="block text-xs font-medium text-gray-500 mb-1">اللغة</label>
									<select {...register(`translations.${index}.lang`)} className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm">
										{languages.map((l) => (
											<option key={l.code} value={l.code}>{languageLabel(l.code, l.native_name)}</option>
										))}
									</select>
								</div>
								<div className="md:col-span-2 flex items-end">
									<label className="flex items-center gap-2">
										<input type="checkbox" {...register(`translations.${index}.is_default`)} onChange={(e) => { if (e.target.checked) { fields.forEach((_, i) => setValue(`translations.${i}.is_default`, i === index)) } else { setValue(`translations.${index}.is_default`, false) } }} className="h-4 w-4 text-primary rounded" />
										<span className="text-sm">اللغة الافتراضية</span>
									</label>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">العنوان *</label>
								<input {...register(`translations.${index}.title`)} dir={translations[index]?.lang === "ar" ? "rtl" : "ltr"} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-lg" />
								{errors.translations?.[index]?.title && <p className="mt-1 text-sm text-red-600">{errors.translations[index]?.title?.message}</p>}
							</div>
						</>
					)}
				/>
			</div>

			<aside className="space-y-6">
				{/* (c) المحاضر */}
				<div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5 space-y-3">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">المحاضر</h3>
						<button
							type="button"
							onClick={() => setSpeakerModalOpen(true)}
							className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
						>
							<Plus className="h-3.5 w-3.5" strokeWidth={1.6} />إضافة محاضر
						</button>
					</div>
					<select {...register("speaker_id")} className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm">
						<option value="">بدون محاضر</option>
						{speakers.map((s) => (
							<option key={s.id} value={s.id}>
								{pickTranslation(s.speaker_translations, s.translation)?.name || "بدون اسم"}
							</option>
						))}
					</select>
				</div>

				{/* (d) الرابط المختصر + النشر */}
				<div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5 space-y-4">
					<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">النشر والرابط</h3>
					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">الرابط المختصر (اختياري)</label>
						<input
							{...register("slug")}
							dir="ltr"
							placeholder="lecture-imam-sajjad"
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm font-mono"
						/>
						{errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>}
						<p className="mt-1 text-[11px] text-gray-400">رابط واحد لكل تسجيل لجميع اللغات. اتركه فارغاً للوصول بالمعرّف فقط.</p>
					</div>
					<label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-gray-200">
						<input type="checkbox" {...register("is_published")} className="h-4 w-4 text-primary rounded" />
						<span className="text-sm">منشور — يظهر على الموقع</span>
					</label>
				</div>

				<div className="flex flex-col gap-2">
					<button type="submit" disabled={isSaving || audioBusy || uploadingPdf} className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white font-semibold rounded-md shadow-soft hover:bg-[hsl(var(--primary)/0.92)] hover:shadow-raise disabled:opacity-50 disabled:cursor-not-allowed transition-all active:translate-y-px">
						{isSaving && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />}
						{audio ? "تحديث التسجيل" : "إنشاء تسجيل"}
					</button>
					<button type="button" onClick={() => router.push("/dashboard/audios")} disabled={isSaving} className="cursor-pointer w-full px-6 py-2.5 border border-[hsl(var(--border-strong))] font-medium rounded-md text-foreground bg-white hover:bg-surface-muted disabled:opacity-50 transition-colors">إلغاء</button>
				</div>
			</aside>

			{speakerModalOpen && (
				<SpeakerQuickCreate
					onClose={() => setSpeakerModalOpen(false)}
					onCreated={(id) => {
						setValue("speaker_id", id)
						setSpeakerModalOpen(false)
					}}
				/>
			)}
		</form>
	)
}

/**
 * Inline mini-modal for creating a speaker without leaving the audio form.
 * Name translations only — the full CRUD lives on /dashboard/speakers.
 */
function SpeakerQuickCreate({ onClose, onCreated }: {
	onClose: () => void
	onCreated: (id: string) => void
}) {
	const { languages } = useActiveLanguages()
	const createSpeaker = useCreateSpeaker()

	const { translations, activeLang, setActiveLang, updateAt, addLang, removeAt, setDefault } =
		useTranslationsField<SpeakerTranslationItem>({
			initial: [{ lang: "ar", name: "", is_default: true }],
			languages,
			makeBlank: (lang) => ({ lang, name: "", is_default: false }),
		})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		e.stopPropagation()
		const cleaned = translations.filter((t) => t.name.trim())
		if (!cleaned.length) { toast.error("أدخل اسماً واحداً على الأقل"); return }
		if (!cleaned.some((t) => t.is_default)) cleaned[0].is_default = true
		createSpeaker.mutate(
			{
				translations: cleaned.map((t) => ({
					lang: t.lang,
					name: t.name.trim(),
					is_default: t.is_default,
				})),
			},
			{
				onSuccess: ({ data }) => {
					toast.success("تم إنشاء المحاضر")
					onCreated(data.id)
				},
				onError: (err) => toast.error(getErrorMessage(err, "فشل إنشاء المحاضر")),
			},
		)
	}

	return (
		<Modal open={true} onClose={onClose} title="إضافة محاضر" size="md">
			<form onSubmit={handleSubmit}>
				<div className="p-6 space-y-4">
					<div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
						{translations.map((t, i) => (
							<button key={i} type="button" onClick={() => setActiveLang(t.lang)}
								className={`cursor-pointer px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeLang === t.lang ? "border-primary text-primary" : "border-transparent text-gray-500"}`}>
								<Globe className="inline h-4 w-4 ml-1" />{languageLabel(t.lang)}
								{t.is_default && <span className="mr-1 text-xs text-gray-400">(الافتراضية)</span>}
								{translations.length > 1 && (
									<span onClick={(e) => { e.stopPropagation(); removeAt(i) }} className="mr-2 text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 className="inline h-3 w-3" /></span>
								)}
							</button>
						))}
						<button type="button" onClick={addLang} className="cursor-pointer px-3 py-2 text-xs text-primary hover:underline whitespace-nowrap"><Plus className="inline h-3 w-3 ml-1" />إضافة لغة</button>
					</div>

					{translations.map((t, i) => (
						<div key={i} className={activeLang === t.lang ? "block space-y-3" : "hidden"}>
							<div className="flex items-end gap-3">
								<div className="flex-1">
									<label className="block text-xs font-medium text-gray-500 mb-1">اللغة</label>
									<select value={t.lang} onChange={(e) => updateAt(i, { lang: e.target.value } as Partial<SpeakerTranslationItem>)} className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm">
										{languages.map((l) => <option key={l.code} value={l.code}>{languageLabel(l.code, l.native_name)}</option>)}
									</select>
								</div>
								<label className="flex items-center gap-2 cursor-pointer pb-2">
									<input type="checkbox" checked={t.is_default} onChange={() => setDefault(i)} className="h-4 w-4 text-primary rounded" />
									<span className="text-sm">الافتراضية</span>
								</label>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">اسم المحاضر *</label>
								<input
									value={t.name}
									onChange={(e) => updateAt(i, { name: e.target.value } as Partial<SpeakerTranslationItem>)}
									maxLength={300}
									dir={t.lang === "ar" ? "rtl" : "ltr"}
									placeholder="الدكتور أبو زهراء النجدي"
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
								/>
							</div>
						</div>
					))}
				</div>
				<div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-200 bg-gray-50">
					<button type="button" onClick={onClose} className="cursor-pointer px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-white">إلغاء</button>
					<button type="submit" disabled={createSpeaker.isPending} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50">
						{createSpeaker.isPending && <Loader2 className="h-4 w-4 animate-spin" />}إنشاء
					</button>
				</div>
			</form>
		</Modal>
	)
}
