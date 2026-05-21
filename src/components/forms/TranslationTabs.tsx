"use client"

import type { ReactNode } from "react"
import { Globe, Plus, Trash2 } from "lucide-react"
import { languageLabel } from "@/lib/useLanguages"

type Translation = {
	lang?: string
	is_default?: boolean
}

type FieldWithId = { id: string }

export type TranslationTabsProps<TField extends FieldWithId> = {
	/** Field array from react-hook-form's useFieldArray. Each entry has an `id`. */
	fields: TField[]
	/** Watched translations array, used to read lang/is_default per index. */
	translations: Translation[]
	/** Currently focused lang code. Undefined → no tab open. */
	activeLang: string | undefined
	onChangeActiveLang: (lang: string) => void
	/** Remove the translation at index from the field array. */
	onRemove: (index: number) => void
	/** Add a new translation (parent picks the next unused language). */
	onAdd: () => void
	/** Section heading shown left of the "Add language" button. */
	title: string
	/** Render-prop for the active translation's body. Called for every tab
	 *  but hidden when not active so react-hook-form keeps inputs registered. */
	renderTranslation: (index: number, lang: string) => ReactNode
}

/**
 * Shared chrome for translation-tabbed forms (Posts, Books, Papers, Categories).
 * Owns:
 *   - the header row with the section title + "إضافة لغة" outline button
 *   - the tabs strip with Globe icon, lang label, is_default marker, remove X
 *   - per-tab visibility (renders all panes but hides inactive ones)
 *
 * The lang-picker / per-translation fields are passed in by the parent via
 * `renderTranslation` — those vary per resource.
 */
export default function TranslationTabs<TField extends FieldWithId>({
	fields,
	translations,
	activeLang,
	onChangeActiveLang,
	onRemove,
	onAdd,
	title,
	renderTranslation,
}: TranslationTabsProps<TField>) {
	return (
		<div className="bg-white shadow-sm rounded-xl border border-[hsl(var(--border))] p-6">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-lg font-medium text-foreground">{title}</h3>
				<button
					type="button"
					onClick={onAdd}
					className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary border border-[hsl(var(--primary)/0.3)] rounded-md hover:bg-[hsl(var(--primary)/0.06)] hover:border-[hsl(var(--primary)/0.6)] transition-colors"
				>
					<Plus className="h-4 w-4" strokeWidth={1.6} />
					إضافة لغة
				</button>
			</div>

			<div className="flex gap-1 mb-6 border-b border-[hsl(var(--border))] overflow-x-auto">
				{fields.map((field, index) => {
					const t = translations[index]
					const tabLang = t?.lang ?? ""
					const isActive = activeLang === tabLang
					return (
						<button
							key={field.id}
							type="button"
							onClick={() => onChangeActiveLang(tabLang)}
							className={`cursor-pointer px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
								isActive
									? "border-primary text-primary"
									: "border-transparent text-[hsl(var(--foreground-muted))] hover:text-foreground"
							}`}
						>
							<Globe className="inline h-4 w-4 ml-1" strokeWidth={1.6} />
							{languageLabel(tabLang)}
							{t?.is_default && (
								<span className="mr-1 text-xs text-[hsl(var(--foreground-subtle))]">
									(الافتراضية)
								</span>
							)}
							{fields.length > 1 && (
								<span
									onClick={(e) => {
										e.stopPropagation()
										onRemove(index)
									}}
									className="mr-2 text-[hsl(var(--foreground-subtle))] hover:text-[hsl(var(--danger))] cursor-pointer"
								>
									<Trash2 className="inline h-3 w-3" strokeWidth={1.6} />
								</span>
							)}
						</button>
					)
				})}
			</div>

			{fields.map((field, index) => {
				const t = translations[index]
				const tabLang = t?.lang ?? ""
				return (
					<div
						key={field.id}
						className={activeLang === tabLang ? "block space-y-4" : "hidden"}
					>
						{renderTranslation(index, tabLang)}
					</div>
				)
			})}
		</div>
	)
}

/**
 * Resolve the translation list off an entity, handling the API inconsistency
 * where the singular `translation` is returned in place of the plural array.
 * Returns an empty array when neither is present — callers chain
 * `.length ? .map(toFormShape) : [blank()]` to handle the create case.
 */
export function pickTranslationsOrEmpty<T>(
	all: T[] | undefined | null,
	singular: T | undefined | null,
): T[] {
	if (Array.isArray(all) && all.length > 0) return all
	if (singular) return [singular]
	return []
}
