"use client"

import { useState } from "react"
import type { Store, StoreLocation, StoreTranslation, StoreLocationTranslation } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import {
	Store as StoreIcon,
	MapPin,
	Phone,
	Plus,
	Pencil,
	Trash2,
	Globe,
	Loader2,
	ExternalLink,
	Map as MapIcon,
} from "lucide-react"
import EmptyState from "@/components/ui/EmptyState"
import PageHeader from "@/components/layout/PageHeader"
import Modal from "@/components/ui/Modal"
import Pagination from "@/components/ui/Pagination"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { ListSkeleton } from "@/components/ui/Skeleton"
import { useActiveLanguages, languageLabel } from "@/lib/useLanguages"
import { pickTranslation } from "@/lib/i18n"
import { formatArNumber } from "@/lib/dates"
import { useTranslationsField } from "@/lib/use-translations-field"
import {
	useStoresList,
	useCreateStore,
	useUpdateStore,
	useDeleteStore,
	useAddStoreLocation,
	useUpdateStoreLocation,
	useRemoveStoreLocation,
} from "@/lib/queries/stores"

type DialogState =
	| { mode: "create-store" }
	| { mode: "edit-store"; store: Store }
	| { mode: "create-location"; store: Store }
	| { mode: "edit-location"; store: Store; location: StoreLocation }
	| null

const cityName = (s: Store) =>
	pickTranslation(s.store_translations, s.translation)?.city_name || "بدون اسم"

const locationName = (l: StoreLocation) =>
	pickTranslation(l.store_location_translations, l.translation)?.name || "بدون اسم"

const locationAddress = (l: StoreLocation) =>
	pickTranslation(l.store_location_translations, l.translation)?.address || ""

export default function StoresPage() {
	const { confirm, dialog: confirmDialog } = useConfirm()
	const [dialog, setDialog] = useState<DialogState>(null)
	const [page, setPage] = useState(1)
	const [limit, setLimit] = useState(20)

	const listQuery = useStoresList({ page, limit })
	const stores = listQuery.data?.items ?? []
	const total = listQuery.data?.pagination.total ?? 0
	const pages = listQuery.data?.pagination.pages ?? 1

	const deleteStore = useDeleteStore()
	const removeLocation = useRemoveStoreLocation()

	const handleDeleteStore = async (s: Store) => {
		const ok = await confirm({
			title: `حذف "${cityName(s)}"؟`,
			description: "ستُحذف المدينة مع جميع نقاط البيع التابعة لها من الموقع العام. يمكن استعادتها من سلة المهملات.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		deleteStore.mutate(s.id, {
			onSuccess: () => toast.success("تم الحذف"),
			onError: (e) => toast.error(getErrorMessage(e, "فشل الحذف")),
		})
	}

	const handleDeleteLocation = async (s: Store, loc: StoreLocation) => {
		const ok = await confirm({
			title: `حذف نقطة البيع "${locationName(loc)}"؟`,
			description: "ستختفي نقطة البيع من الموقع العام فوراً.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		removeLocation.mutate(
			{ storeId: s.id, locationId: loc.id },
			{
				onSuccess: () => toast.success("تم الحذف"),
				onError: (e) => toast.error(getErrorMessage(e, "فشل الحذف")),
			},
		)
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="منافذ البيع"
				description="المدن ونقاط البيع التابعة لها. تُعرض على الموقع العام مرتّبة حسب ترتيب العرض."
				icon={StoreIcon}
				actions={
					<button onClick={() => setDialog({ mode: "create-store" })} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
						<Plus className="h-4 w-4" />مدينة جديدة
					</button>
				}
			/>

			{listQuery.isLoading ? (
				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<ListSkeleton rows={5} />
				</div>
			) : stores.length === 0 ? (
				<EmptyState
					variant="card"
					icon={StoreIcon}
					title="لا توجد منافذ بيع بعد"
					description="أضف أوّل مدينة ثم أدرج نقاط البيع التابعة لها."
					action={(
						<button onClick={() => setDialog({ mode: "create-store" })} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90">
							<Plus className="h-4 w-4" />أضف أوّل مدينة
						</button>
					)}
				/>
			) : (
				<div className="space-y-4">
					{stores.map((s) => (
						<div key={s.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-md transition-all">
							<div className="flex items-start justify-between gap-3 p-5 pb-3">
								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<StoreIcon className="h-4 w-4 text-primary shrink-0" />
										<h3 className="text-base font-semibold text-gray-900 truncate">{cityName(s)}</h3>
										<span className="text-[11px] font-mono text-gray-400">#{s.display_order}</span>
									</div>
									<div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
										<span className="inline-flex items-center gap-1">
											<MapPin className="h-3 w-3" />{formatArNumber(s.store_locations.length)} نقطة بيع
										</span>
										<span className="inline-flex items-center gap-1">
											<Globe className="h-3 w-3" />{formatArNumber(s.store_translations.length)} ترجمة
										</span>
									</div>
								</div>
								<div className="flex gap-1 shrink-0">
									<button onClick={() => setDialog({ mode: "create-location", store: s })} className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-primary border border-primary/30 rounded-md hover:bg-primary/5" title="إضافة نقطة بيع">
										<Plus className="h-3.5 w-3.5" />إضافة نقطة بيع
									</button>
									<button onClick={() => setDialog({ mode: "edit-store", store: s })} className="cursor-pointer p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded" title="تعديل المدينة"><Pencil className="h-4 w-4" /></button>
									<button onClick={() => handleDeleteStore(s)} className="cursor-pointer p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="حذف المدينة"><Trash2 className="h-4 w-4" /></button>
								</div>
							</div>

							<div className="border-t border-gray-100 px-5 py-2">
								{s.store_locations.length === 0 ? (
									<p className="text-xs text-gray-400 py-2">لا توجد نقاط بيع في هذه المدينة بعد.</p>
								) : (
									<ul className="divide-y divide-gray-100">
										{s.store_locations.map((loc) => (
											<li key={loc.id} className="py-3 flex items-start justify-between gap-3">
												<div className="min-w-0">
													<p className="text-sm font-medium text-gray-800 truncate">{locationName(loc)}</p>
													{locationAddress(loc) && (
														<p className="text-xs text-gray-500 mt-0.5">{locationAddress(loc)}</p>
													)}
													<div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-gray-400">
														{loc.phone && (
															<span className="inline-flex items-center gap-1">
																<Phone className="h-3 w-3" /><span dir="ltr">{loc.phone}</span>
															</span>
														)}
														{loc.gps_link && (
															<a href={loc.gps_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
																<ExternalLink className="h-3 w-3" />رابط الخريطة
															</a>
														)}
														{loc.gps_embed_url && (
															<span className="inline-flex items-center gap-1">
																<MapIcon className="h-3 w-3" />خريطة مضمّنة
															</span>
														)}
														<span className="font-mono">#{loc.display_order}</span>
													</div>
												</div>
												<div className="flex gap-1 shrink-0">
													<button onClick={() => setDialog({ mode: "edit-location", store: s, location: loc })} className="cursor-pointer p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded" title="تعديل نقطة البيع"><Pencil className="h-4 w-4" /></button>
													<button onClick={() => handleDeleteLocation(s, loc)} className="cursor-pointer p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="حذف نقطة البيع"><Trash2 className="h-4 w-4" /></button>
												</div>
											</li>
										))}
									</ul>
								)}
							</div>
						</div>
					))}
				</div>
			)}

			<Pagination
				page={page} pages={pages} total={total} limit={limit}
				onPage={setPage}
				onLimit={(n) => { setLimit(n); setPage(1) }}
			/>

			{dialog?.mode === "create-store" && (
				<StoreEditor onClose={() => setDialog(null)} />
			)}
			{dialog?.mode === "edit-store" && (
				<StoreEditor initial={dialog.store} onClose={() => setDialog(null)} />
			)}
			{dialog?.mode === "create-location" && (
				<LocationEditor store={dialog.store} onClose={() => setDialog(null)} />
			)}
			{dialog?.mode === "edit-location" && (
				<LocationEditor store={dialog.store} initial={dialog.location} onClose={() => setDialog(null)} />
			)}
			{confirmDialog}
		</div>
	)
}

function StoreEditor({ initial, onClose }: { initial?: Store; onClose: () => void }) {
	const { languages } = useActiveLanguages()
	const isEdit = !!initial
	const createStore = useCreateStore()
	const updateStore = useUpdateStore()
	const saving = createStore.isPending || updateStore.isPending

	const [displayOrder, setDisplayOrder] = useState<number>(initial?.display_order ?? 0)

	// Seed ar/en/fa tabs on create so the editor shows the expected languages
	// up-front; empty tabs are filtered out at submit time. Store translations
	// carry NO is_default flag (API DTO has none).
	const seedTranslations = (): StoreTranslation[] => {
		if (initial?.store_translations.length) {
			return initial.store_translations.map((t) => ({ ...t }))
		}
		const seedLangs = ["ar", "en", "fa"]
		const seeded = seedLangs
			.filter((code) => languages.some((l) => l.code === code))
			.map((code) => ({ lang: code, city_name: "" }))
		return seeded.length ? seeded : [{ lang: "ar", city_name: "" }]
	}

	const { translations, activeLang, setActiveLang, updateAt: updateT, addLang, removeAt: removeLang } =
		useTranslationsField<StoreTranslation>({
			initial: seedTranslations(),
			languages,
			makeBlank: (lang) => ({ lang, city_name: "" }),
			requireDefault: false,
		})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		const cleaned = translations
			.filter((t) => t.city_name.trim())
			.map((t) => ({ lang: t.lang, city_name: t.city_name.trim() }))
		if (!cleaned.length) { toast.error("أضف اسم المدينة بلغة واحدة على الأقل"); return }
		const body = { translations: cleaned, display_order: displayOrder }
		const handlers = {
			onSuccess: () => {
				toast.success(isEdit ? "تم التحديث" : "تم الإنشاء")
				onClose()
			},
			onError: (e: unknown) => toast.error(getErrorMessage(e, "فشل الحفظ")),
		}
		if (isEdit && initial) updateStore.mutate({ id: initial.id, body }, handlers)
		else createStore.mutate(body, handlers)
	}

	return (
		<Modal open={true} onClose={onClose} title={isEdit ? "تعديل المدينة" : "مدينة جديدة"} size="md">
			<form onSubmit={handleSubmit}>
				<div className="p-6 space-y-4">
					<div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
						{translations.map((t, i) => (
							<button key={i} type="button" onClick={() => setActiveLang(t.lang)}
								className={`cursor-pointer px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeLang === t.lang ? "border-primary text-primary" : "border-transparent text-gray-500"}`}>
								<Globe className="inline h-4 w-4 ml-1" />{languageLabel(t.lang)}
								{translations.length > 1 && (
									<span onClick={(e) => { e.stopPropagation(); removeLang(i) }} className="mr-2 text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 className="inline h-3 w-3" /></span>
								)}
							</button>
						))}
						<button type="button" onClick={addLang} className="cursor-pointer px-3 py-2 text-xs text-primary hover:underline whitespace-nowrap"><Plus className="inline h-3 w-3 ml-1" />إضافة لغة</button>
					</div>

					{translations.map((t, i) => (
						<div key={i} className={activeLang === t.lang ? "block space-y-3" : "hidden"}>
							<div>
								<label className="block text-xs font-medium text-gray-500 mb-1">اللغة</label>
								<select value={t.lang} onChange={(e) => updateT(i, { lang: e.target.value })} className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm">
									{languages.map((l) => <option key={l.code} value={l.code}>{languageLabel(l.code, l.native_name)}</option>)}
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">اسم المدينة *</label>
								<input
									value={t.city_name}
									onChange={(e) => updateT(i, { city_name: e.target.value })}
									maxLength={200}
									placeholder="كربلاء المقدسة"
									dir={t.lang === "ar" ? "rtl" : "ltr"}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
								/>
							</div>
						</div>
					))}

					<div className="pt-2 border-t border-gray-200">
						<label className="block text-sm font-medium text-gray-700 mb-1">ترتيب العرض</label>
						<input
							type="number"
							min={0}
							value={displayOrder}
							onChange={(e) => setDisplayOrder(Math.max(0, Number(e.target.value) || 0))}
							className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
						/>
						<p className="mt-1 text-[11px] text-gray-400">الأصغر يظهر أولاً على الموقع العام.</p>
					</div>
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

const isHttpUrl = (v: string) => /^https?:\/\/\S+$/i.test(v)

function LocationEditor({ store, initial, onClose }: { store: Store; initial?: StoreLocation; onClose: () => void }) {
	const { languages } = useActiveLanguages()
	const isEdit = !!initial
	const addLocation = useAddStoreLocation()
	const updateLocation = useUpdateStoreLocation()
	const saving = addLocation.isPending || updateLocation.isPending

	const [phone, setPhone] = useState(initial?.phone ?? "")
	const [gpsEmbedUrl, setGpsEmbedUrl] = useState(initial?.gps_embed_url ?? "")
	const [gpsLink, setGpsLink] = useState(initial?.gps_link ?? "")
	const [displayOrder, setDisplayOrder] = useState<number>(initial?.display_order ?? 0)

	// Location translations carry NO is_default flag (API DTO has none).
	const seedTranslations = (): StoreLocationTranslation[] => {
		if (initial?.store_location_translations.length) {
			return initial.store_location_translations.map((t) => ({ ...t }))
		}
		const seedLangs = ["ar", "en", "fa"]
		const seeded = seedLangs
			.filter((code) => languages.some((l) => l.code === code))
			.map((code) => ({ lang: code, name: "", address: "" }))
		return seeded.length ? seeded : [{ lang: "ar", name: "", address: "" }]
	}

	const { translations, activeLang, setActiveLang, updateAt: updateT, addLang, removeAt: removeLang } =
		useTranslationsField<StoreLocationTranslation>({
			initial: seedTranslations(),
			languages,
			makeBlank: (lang) => ({ lang, name: "", address: "" }),
			requireDefault: false,
		})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		const cleaned = translations
			.filter((t) => t.name.trim() || t.address.trim())
			.map((t) => ({ lang: t.lang, name: t.name.trim(), address: t.address.trim() }))
		if (!cleaned.length) { toast.error("أضف اسم نقطة البيع وعنوانها بلغة واحدة على الأقل"); return }
		const incomplete = cleaned.find((t) => !t.name || !t.address)
		if (incomplete) { toast.error(`أكمل الاسم والعنوان معاً للغة ${languageLabel(incomplete.lang)}`); return }
		const embed = gpsEmbedUrl.trim()
		const link = gpsLink.trim()
		if (embed && !isHttpUrl(embed)) { toast.error("رابط الخريطة المضمّنة يجب أن يبدأ بـ http:// أو https://"); return }
		if (link && !isHttpUrl(link)) { toast.error("رابط الخريطة يجب أن يبدأ بـ http:// أو https://"); return }
		// PATCH semantics: undefined = leave unchanged, null = clear. On edit,
		// send null for emptied fields so a wrong phone/URL can be removed.
		const body = {
			phone: phone.trim() || (isEdit ? null : undefined),
			gps_embed_url: embed || (isEdit ? null : undefined),
			gps_link: link || (isEdit ? null : undefined),
			display_order: displayOrder,
			translations: cleaned,
		}
		const handlers = {
			onSuccess: () => {
				toast.success(isEdit ? "تم التحديث" : "تمت الإضافة")
				onClose()
			},
			onError: (e: unknown) => toast.error(getErrorMessage(e, "فشل الحفظ")),
		}
		if (isEdit && initial) updateLocation.mutate({ storeId: store.id, locationId: initial.id, body }, handlers)
		else addLocation.mutate({ storeId: store.id, body }, handlers)
	}

	return (
		<Modal open={true} onClose={onClose} title={isEdit ? "تعديل نقطة البيع" : `نقطة بيع جديدة — ${cityName(store)}`} size="lg">
			<form onSubmit={handleSubmit}>
				<div className="p-6 space-y-4">
					<div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
						{translations.map((t, i) => (
							<button key={i} type="button" onClick={() => setActiveLang(t.lang)}
								className={`cursor-pointer px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeLang === t.lang ? "border-primary text-primary" : "border-transparent text-gray-500"}`}>
								<Globe className="inline h-4 w-4 ml-1" />{languageLabel(t.lang)}
								{translations.length > 1 && (
									<span onClick={(e) => { e.stopPropagation(); removeLang(i) }} className="mr-2 text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 className="inline h-3 w-3" /></span>
								)}
							</button>
						))}
						<button type="button" onClick={addLang} className="cursor-pointer px-3 py-2 text-xs text-primary hover:underline whitespace-nowrap"><Plus className="inline h-3 w-3 ml-1" />إضافة لغة</button>
					</div>

					{translations.map((t, i) => (
						<div key={i} className={activeLang === t.lang ? "block space-y-3" : "hidden"}>
							<div>
								<label className="block text-xs font-medium text-gray-500 mb-1">اللغة</label>
								<select value={t.lang} onChange={(e) => updateT(i, { lang: e.target.value })} className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm">
									{languages.map((l) => <option key={l.code} value={l.code}>{languageLabel(l.code, l.native_name)}</option>)}
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">اسم نقطة البيع *</label>
								<input
									value={t.name}
									onChange={(e) => updateT(i, { name: e.target.value })}
									maxLength={300}
									placeholder="مكتبة الروضة الحسينية"
									dir={t.lang === "ar" ? "rtl" : "ltr"}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">العنوان *</label>
								<textarea
									value={t.address}
									onChange={(e) => updateT(i, { address: e.target.value })}
									rows={2}
									maxLength={500}
									placeholder="شارع باب القبلة، بجوار الصحن الشريف"
									dir={t.lang === "ar" ? "rtl" : "ltr"}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm leading-relaxed"
								/>
							</div>
						</div>
					))}

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
							<input
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								maxLength={50}
								placeholder="+964 770 000 0000"
								dir="ltr"
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">ترتيب العرض</label>
							<input
								type="number"
								min={0}
								value={displayOrder}
								onChange={(e) => setDisplayOrder(Math.max(0, Number(e.target.value) || 0))}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
							/>
						</div>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">رابط الخريطة المضمّنة (iframe)</label>
						<input
							value={gpsEmbedUrl}
							onChange={(e) => setGpsEmbedUrl(e.target.value)}
							maxLength={2000}
							placeholder="https://www.google.com/maps/embed?pb=..."
							dir="ltr"
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm font-mono"
						/>
						<p className="mt-1 text-[11px] text-gray-400">قيمة src من كود التضمين في خرائط Google (مشاركة ← تضمين خريطة).</p>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">رابط الخريطة (مشاركة)</label>
						<input
							value={gpsLink}
							onChange={(e) => setGpsLink(e.target.value)}
							maxLength={2000}
							placeholder="https://maps.app.goo.gl/..."
							dir="ltr"
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm font-mono"
						/>
					</div>
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
