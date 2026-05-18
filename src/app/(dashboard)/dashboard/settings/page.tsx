"use client"

import { useMemo, useState } from "react"
import type { Setting, SettingType, UpsertSetting } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import {
	Loader2, Settings as SettingsIcon, Save, Plus, Trash2, Lock, Globe,
	Building2, Phone, Share2, Code, Pencil, AlertCircle,
} from "lucide-react"
import EmptyState from "@/components/ui/EmptyState"
import PageHeader from "@/components/layout/PageHeader"
import Modal from "@/components/ui/Modal"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { Skeleton } from "@/components/ui/Skeleton"
import {
	useSettingsList,
	useUpsertSetting,
	useDeleteSetting,
} from "@/lib/queries/settings"

type FieldKind = "text" | "textarea" | "url" | "email" | "tel" | "number" | "boolean" | "json"

type FieldDef = {
	key: string
	label: string
	hint?: string
	kind: FieldKind
	type: SettingType
	is_public: boolean
	placeholder?: string
	dir?: "ltr" | "rtl"
}

type GroupDef = {
	id: string
	title: string
	description: string
	icon: typeof SettingsIcon
	fields: FieldDef[]
}

/**
 * Curated, presentation-friendly groups over the underlying free-form
 * key/value store. Adding a new field is a one-line addition here.
 * Keys remain snake_case in storage but are surfaced via Arabic labels.
 */
const GROUPS: GroupDef[] = [
	{
		id: "identity",
		title: "هوية الموقع",
		description: "اسم الموقع، الشعار، والمعرف الموجز للمؤسسة.",
		icon: Building2,
		fields: [
			{ key: "site_name", label: "اسم الموقع", hint: "يظهر في عنوان الصفحة وفي روابط المشاركة.", kind: "text", type: "string", is_public: true, placeholder: "مؤسسة الإمام زين العابدين" },
			{ key: "site_tagline", label: "الشعار / العبارة المختصرة", hint: "تظهر تحت اسم الموقع في الرأس.", kind: "text", type: "string", is_public: true, placeholder: "للبحوث والدراسات" },
			{ key: "site_description", label: "وصف الموقع", hint: "يظهر في وسم meta description افتراضياً.", kind: "textarea", type: "string", is_public: true, placeholder: "موقع رسمي للمؤسسة..." },
		],
	},
	{
		id: "contact",
		title: "معلومات التواصل",
		description: "هواتف وبريد إلكتروني تظهر في صفحة \"تواصل معنا\" وتذييل الموقع.",
		icon: Phone,
		fields: [
			{ key: "contact_email", label: "البريد الإلكتروني الرسمي", kind: "email", type: "string", is_public: true, placeholder: "info@imamzain.org", dir: "ltr" },
			{ key: "contact_phone", label: "رقم الهاتف", kind: "tel", type: "string", is_public: true, placeholder: "+964 ...", dir: "ltr" },
			{ key: "contact_address", label: "العنوان", kind: "textarea", type: "string", is_public: true, placeholder: "كربلاء، العراق..." },
		],
	},
	{
		id: "social",
		title: "روابط التواصل الاجتماعي",
		description: "تظهر كأيقونات في تذييل الموقع وصفحات المشاركة.",
		icon: Share2,
		fields: [
			{ key: "social_facebook", label: "فيسبوك", kind: "url", type: "string", is_public: true, placeholder: "https://facebook.com/...", dir: "ltr" },
			{ key: "social_twitter", label: "تويتر / X", kind: "url", type: "string", is_public: true, placeholder: "https://x.com/...", dir: "ltr" },
			{ key: "social_youtube", label: "يوتيوب", kind: "url", type: "string", is_public: true, placeholder: "https://youtube.com/@...", dir: "ltr" },
			{ key: "social_instagram", label: "إنستغرام", kind: "url", type: "string", is_public: true, placeholder: "https://instagram.com/...", dir: "ltr" },
			{ key: "social_telegram", label: "تيليغرام", kind: "url", type: "string", is_public: true, placeholder: "https://t.me/...", dir: "ltr" },
		],
	},
	{
		id: "advanced",
		title: "إعدادات متقدمة",
		description: "مفاتيح خاصة بالمطورين وكود تتبع زوار الموقع.",
		icon: Code,
		fields: [
			{ key: "analytics_id", label: "معرّف Google Analytics", hint: "مثال: G-XXXXXXXXXX", kind: "text", type: "string", is_public: false, placeholder: "G-XXXXXXXXXX", dir: "ltr" },
			{ key: "maintenance_mode", label: "وضع الصيانة", hint: "عند التفعيل، يظهر للزوار صفحة \"الموقع تحت الصيانة\".", kind: "boolean", type: "boolean", is_public: false },
		],
	},
]

/** Settings already represented in groups — keep them out of the "أخرى" bucket. */
const KNOWN_KEYS = new Set(GROUPS.flatMap((g) => g.fields.map((f) => f.key)))

const TYPE_LABEL: Record<SettingType, string> = {
	string: "نص",
	number: "رقم",
	boolean: "نعم/لا",
	json: "JSON",
}

function settingDisplayValue(s: Setting): string {
	if (s.value === null || s.value === undefined) return ""
	if (s.type === "boolean") return String(Boolean(s.value))
	if (s.type === "json") return JSON.stringify(s.value, null, 2)
	return String(s.value)
}

function settingInputValue(s: Setting | undefined): string {
	if (!s) return ""
	return settingDisplayValue(s)
}

export default function SettingsPage() {
	const { confirm, dialog: confirmDialog } = useConfirm()

	const listQuery = useSettingsList()
	const settings = useMemo(() => listQuery.data ?? [], [listQuery.data])
	const byKey = useMemo(() => {
		const m = new Map<string, Setting>()
		for (const s of settings) m.set(s.key, s)
		return m
	}, [settings])

	const extras = useMemo(
		() => settings.filter((s) => !KNOWN_KEYS.has(s.key)),
		[settings],
	)

	const upsert = useUpsertSetting()
	const removeSetting = useDeleteSetting()

	const [customDialog, setCustomDialog] = useState<null | { mode: "create" } | { mode: "edit"; setting: Setting }>(null)

	const saveField = (field: FieldDef, raw: string) => {
		const body: UpsertSetting = {
			value: field.kind === "boolean" ? (raw === "true" ? "true" : "false") : raw,
			type: field.type,
			is_public: field.is_public,
		}
		return new Promise<void>((resolve, reject) => {
			upsert.mutate({ key: field.key, body }, {
				onSuccess: () => { toast.success(`تم حفظ "${field.label}"`); resolve() },
				onError: (e) => { toast.error(getErrorMessage(e, "فشل الحفظ")); reject(e) },
			})
		})
	}

	const handleDeleteExtra = async (s: Setting) => {
		const ok = await confirm({
			title: `حذف الإعداد "${s.key}"؟`,
			description: "سيُحذف نهائياً. إن كان مرتبطاً بصفحات في الموقع، قد تختفي القيم.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		removeSetting.mutate(s.key, {
			onSuccess: () => toast.success("تم الحذف"),
			onError: (e) => toast.error(getErrorMessage(e, "تعذّر الحذف")),
		})
	}

	if (listQuery.isLoading) {
		return (
			<div className="space-y-6">
				<PageHeader
					title="إعدادات الموقع"
					description="إعدادات تظهر في الموقع العام (مثل اسم الموقع وروابط التواصل) وإعدادات إدارية داخلية."
					icon={SettingsIcon}
				/>
				{Array.from({ length: 4 }).map((_, gi) => (
					<section key={gi} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
						<header className="px-5 py-4 border-b border-gray-100 flex items-start gap-3 bg-linear-to-l from-primary/5 to-transparent">
							<Skeleton className="h-9 w-9 rounded-md" />
							<div className="space-y-2 flex-1">
								<Skeleton className="h-4 w-1/4" />
								<Skeleton className="h-3 w-1/2" />
							</div>
						</header>
						<div className="p-5 space-y-5">
							{Array.from({ length: 3 }).map((_, fi) => (
								<div key={fi} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
									<div className="space-y-2">
										<Skeleton className="h-4 w-1/2" />
										<Skeleton className="h-3 w-3/4" />
									</div>
									<div className="md:col-span-2 space-y-2">
										<Skeleton className="h-10 w-full" />
										<Skeleton className="h-7 w-20" />
									</div>
								</div>
							))}
						</div>
					</section>
				))}
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="إعدادات الموقع"
				description="إعدادات تظهر في الموقع العام (مثل اسم الموقع وروابط التواصل) وإعدادات إدارية داخلية."
				icon={SettingsIcon}
			/>

			{GROUPS.map((group) => (
				<SettingsGroup
					key={group.id}
					group={group}
					getSetting={(key) => byKey.get(key)}
					onSave={saveField}
					isSaving={upsert.isPending}
				/>
			))}

			<div className="bg-white rounded-xl border border-gray-200">
				<div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
					<div className="flex items-start gap-3">
						<div className="w-9 h-9 rounded-md bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
							<SettingsIcon className="h-4 w-4" />
						</div>
						<div>
							<h2 className="text-base font-semibold text-gray-900">إعدادات مخصصة</h2>
							<p className="text-xs text-gray-500 mt-0.5">مفاتيح حرّة غير مدرجة ضمن المجموعات أعلاه.</p>
						</div>
					</div>
					<button
						onClick={() => setCustomDialog({ mode: "create" })}
						className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-md hover:bg-primary/90"
					>
						<Plus className="h-4 w-4" />إعداد مخصص
					</button>
				</div>
				{extras.length === 0 ? (
					<EmptyState
						icon={SettingsIcon}
						title="لا توجد إعدادات مخصصة"
						description="استخدم الإعدادات المخصصة لإضافة مفاتيح خارج المجموعات أعلاه."
						className="py-8!"
					/>
				) : (
					<ul className="divide-y divide-gray-100">
						{extras.map((s) => (
							<li key={s.key} className="px-5 py-3 flex items-start justify-between gap-3 hover:bg-gray-50/60">
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<span className="font-mono text-sm text-gray-900" dir="ltr">{s.key}</span>
										<span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 text-[10px] rounded-full">{TYPE_LABEL[s.type]}</span>
										{s.is_public ? (
											<span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-700 text-[10px] rounded-full"><Globe className="h-2.5 w-2.5" />عام</span>
										) : (
											<span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] rounded-full"><Lock className="h-2.5 w-2.5" />إدارة</span>
										)}
									</div>
									{s.description && <p className="text-xs text-gray-500 mt-1">{s.description}</p>}
									<p className="text-sm text-gray-700 mt-1.5 truncate" dir={s.type === "string" ? "auto" : "ltr"}>
										{settingDisplayValue(s) || <span className="text-gray-400">—</span>}
									</p>
								</div>
								<div className="flex gap-1 shrink-0">
									<button onClick={() => setCustomDialog({ mode: "edit", setting: s })} className="cursor-pointer p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded" title="تعديل"><Pencil className="h-4 w-4" /></button>
									<button onClick={() => handleDeleteExtra(s)} className="cursor-pointer p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="حذف"><Trash2 className="h-4 w-4" /></button>
								</div>
							</li>
						))}
					</ul>
				)}
			</div>

			{customDialog && (
				<CustomSettingDialog
					state={customDialog}
					byKey={byKey}
					onClose={() => setCustomDialog(null)}
					onSave={(key, body) => new Promise<void>((resolve, reject) => {
						upsert.mutate({ key, body }, {
							onSuccess: () => { toast.success(customDialog.mode === "create" ? "تم إنشاء الإعداد" : "تم تحديث الإعداد"); setCustomDialog(null); resolve() },
							onError: (e) => { toast.error(getErrorMessage(e, "فشل الحفظ")); reject(e) },
						})
					})}
				/>
			)}
			{confirmDialog}
		</div>
	)
}

function SettingsGroup({
	group, getSetting, onSave, isSaving,
}: {
	group: GroupDef
	getSetting: (key: string) => Setting | undefined
	onSave: (field: FieldDef, raw: string) => Promise<void>
	isSaving: boolean
}) {
	const Icon = group.icon
	return (
		<section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
			<header className="px-5 py-4 border-b border-gray-100 flex items-start gap-3 bg-linear-to-l from-primary/5 to-transparent">
				<div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
					<Icon className="h-4 w-4" />
				</div>
				<div>
					<h2 className="text-base font-semibold text-gray-900">{group.title}</h2>
					<p className="text-xs text-gray-500 mt-0.5">{group.description}</p>
				</div>
			</header>
			<div className="p-5 space-y-5">
				{group.fields.map((field) => (
					<SettingField
						key={field.key}
						field={field}
						setting={getSetting(field.key)}
						onSave={(raw) => onSave(field, raw)}
						isSaving={isSaving}
					/>
				))}
			</div>
		</section>
	)
}

function SettingField({
	field, setting, onSave, isSaving,
}: {
	field: FieldDef
	setting: Setting | undefined
	onSave: (raw: string) => Promise<void>
	isSaving: boolean
}) {
	const initial = settingInputValue(setting)
	const [value, setValue] = useState(initial)
	const dirty = value !== initial

	const reset = () => setValue(initial)
	const save = async () => {
		try {
			await onSave(value)
		} catch { /* toasted upstream */ }
	}

	const input = (() => {
		const common = "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm bg-white text-gray-900 placeholder:text-gray-400"
		if (field.kind === "boolean") {
			const on = value === "true"
			return (
				<label className="flex items-center gap-2 cursor-pointer select-none">
					<input
						type="checkbox"
						checked={on}
						onChange={(e) => setValue(e.target.checked ? "true" : "false")}
						className="h-4 w-4 text-primary rounded"
					/>
					<span className="text-sm text-gray-800">{on ? "مُفعَّل" : "غير مفعَّل"}</span>
				</label>
			)
		}
		if (field.kind === "textarea") {
			return (
				<textarea
					value={value}
					onChange={(e) => setValue(e.target.value)}
					rows={3}
					placeholder={field.placeholder}
					dir={field.dir ?? "auto"}
					className={common}
				/>
			)
		}
		if (field.kind === "json") {
			return (
				<textarea
					value={value}
					onChange={(e) => setValue(e.target.value)}
					rows={5}
					placeholder={field.placeholder ?? '{"key":"value"}'}
					dir="ltr"
					className={`${common} font-mono text-xs`}
				/>
			)
		}
		const htmlType = field.kind === "url" ? "url" : field.kind === "email" ? "email" : field.kind === "tel" ? "tel" : field.kind === "number" ? "number" : "text"
		return (
			<input
				type={htmlType}
				value={value}
				onChange={(e) => setValue(e.target.value)}
				placeholder={field.placeholder}
				dir={field.dir ?? "auto"}
				className={common}
			/>
		)
	})()

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
			<div className="md:col-span-1">
				<label className="block text-sm font-medium text-gray-900">{field.label}</label>
				{field.hint && <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{field.hint}</p>}
				<p className="mt-1 text-[10px] font-mono text-gray-400" dir="ltr">{field.key}</p>
			</div>
			<div className="md:col-span-2 space-y-2">
				{input}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={save}
						disabled={!dirty || isSaving}
						className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}حفظ
					</button>
					{dirty && (
						<button type="button" onClick={reset} className="cursor-pointer px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700">
							تراجع
						</button>
					)}
					{dirty && (
						<span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
							<AlertCircle className="h-3 w-3" />غير محفوظ
						</span>
					)}
				</div>
			</div>
		</div>
	)
}

function CustomSettingDialog({
	state, byKey, onClose, onSave,
}: {
	state: { mode: "create" } | { mode: "edit"; setting: Setting }
	byKey: Map<string, Setting>
	onClose: () => void
	onSave: (key: string, body: UpsertSetting) => Promise<void>
}) {
	const isEdit = state.mode === "edit"
	const existing = isEdit ? state.setting : null
	const [key, setKey] = useState(existing?.key ?? "")
	const [type, setType] = useState<SettingType>(existing?.type ?? "string")
	const [value, setValue] = useState(existing ? settingDisplayValue(existing) : "")
	const [description, setDescription] = useState(existing?.description ?? "")
	const [isPublic, setIsPublic] = useState(existing?.is_public ?? false)
	const [saving, setSaving] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		const trimmedKey = key.trim()
		if (!trimmedKey) { toast.error("المفتاح مطلوب"); return }
		if (!isEdit && byKey.has(trimmedKey)) {
			toast.error("مفتاح موجود بالفعل")
			return
		}
		setSaving(true)
		try {
			await onSave(trimmedKey, {
				value,
				type: isEdit ? undefined : type,
				description: description.trim() || undefined,
				is_public: isPublic,
			})
		} catch { /* toasted */ }
		finally { setSaving(false) }
	}

	return (
		<Modal open={true} onClose={onClose} title={isEdit ? `تعديل "${existing!.key}"` : "إعداد مخصص جديد"} size="md">
			<form onSubmit={handleSubmit}>
				<div className="p-6 space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-800 mb-1.5">المفتاح</label>
						<input
							required
							value={key}
							onChange={(e) => setKey(e.target.value)}
							dir="ltr"
							readOnly={isEdit}
							placeholder="site_name"
							className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary font-mono text-sm ${isEdit ? "bg-gray-50 text-gray-500" : ""}`}
						/>
						<p className="mt-1 text-[11px] text-gray-500">معرّف داخلي بصيغة snake_case. لا يمكن تعديله بعد الإنشاء.</p>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-800 mb-1.5">النوع</label>
						<select
							value={type}
							onChange={(e) => setType(e.target.value as SettingType)}
							disabled={isEdit}
							className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm disabled:bg-gray-50"
						>
							<option value="string">{TYPE_LABEL.string}</option>
							<option value="number">{TYPE_LABEL.number}</option>
							<option value="boolean">{TYPE_LABEL.boolean}</option>
							<option value="json">{TYPE_LABEL.json}</option>
						</select>
						<p className="mt-1 text-[11px] text-gray-500">النوع غير قابل للتعديل بعد الإنشاء.</p>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-800 mb-1.5">القيمة</label>
						{type === "boolean" ? (
							<select value={value} onChange={(e) => setValue(e.target.value)} className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm">
								<option value="true">true</option>
								<option value="false">false</option>
							</select>
						) : type === "json" ? (
							<textarea
								value={value}
								onChange={(e) => setValue(e.target.value)}
								rows={5}
								dir="ltr"
								placeholder='{"key":"value"}'
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary font-mono text-xs"
							/>
						) : (
							<input
								required
								type={type === "number" ? "number" : "text"}
								value={value}
								onChange={(e) => setValue(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
							/>
						)}
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-800 mb-1.5">الوصف</label>
						<input
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="ما الذي يستخدمه؟ (اختياري)"
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
						/>
					</div>
					<label className="flex items-center gap-2 cursor-pointer">
						<input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-4 w-4 text-primary rounded" />
						<span className="text-sm text-gray-900">قابل للقراءة من الموقع العام (يظهر في /settings/public)</span>
					</label>
				</div>
				<div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-200 bg-gray-50">
					<button type="button" onClick={onClose} className="cursor-pointer px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-white">إلغاء</button>
					<button type="submit" disabled={saving} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50">
						{saving && <Loader2 className="h-4 w-4 animate-spin" />}حفظ
					</button>
				</div>
			</form>
		</Modal>
	)
}
