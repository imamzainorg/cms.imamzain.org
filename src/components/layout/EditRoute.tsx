"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

/**
 * Edit screens read the record id from `?id=` (see `@/lib/routes`). This is
 * the one place that does it: it supplies the Suspense boundary
 * `useSearchParams` needs in a static export, and a clear message when the
 * link has no id, then hands the id to its render prop.
 */
export default function EditRoute({
	children,
}: {
	children: (id: string) => React.ReactNode
}) {
	return (
		<Suspense fallback={<Spinner />}>
			<EditRouteInner>{children}</EditRouteInner>
		</Suspense>
	)
}

function EditRouteInner({ children }: { children: (id: string) => React.ReactNode }) {
	const id = useSearchParams().get("id")
	if (!id) return <p className="text-gray-500">الرابط لا يحدّد العنصر المطلوب تعديله — عُد إلى القائمة واختر عنصراً.</p>
	return <>{children(id)}</>
}

function Spinner() {
	return (
		<div className="flex items-center justify-center py-12">
			<Loader2 className="h-8 w-8 animate-spin text-primary" />
		</div>
	)
}

export { Spinner as EditRouteSpinner }
