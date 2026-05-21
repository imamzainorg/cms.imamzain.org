"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type PageTitleContextValue = {
	title: string
	setTitle: (title: string) => void
}

const PageTitleContext = createContext<PageTitleContextValue | null>(null)

/**
 * Provides a shared page-title slot consumed by the layout chrome (Header)
 * and published by each route via `<PageHeader title="…">`. Replaces the
 * previous hand-maintained pathname→title ladder that silently regressed
 * to "لوحة التحكم" every time a new route was added.
 */
export function PageTitleProvider({ children }: { children: ReactNode }) {
	const [title, setTitle] = useState("")
	return (
		<PageTitleContext.Provider value={{ title, setTitle }}>
			{children}
		</PageTitleContext.Provider>
	)
}

export function usePageTitle(): PageTitleContextValue | null {
	return useContext(PageTitleContext)
}
