import type { Metadata } from "next"
import { Noto_Naskh_Arabic, Inter } from "next/font/google"
import "./globals.css"
import QueryProvider from "@/components/providers/QueryProvider"

// Noto Naskh Arabic shapes letters correctly across positions (initial / medial
// / final / isolated) — Cairo was rendering some letters in their medial form
// where they should have been initial, visible in the audit-logs feed.
const naskh = Noto_Naskh_Arabic({
	subsets: ["arabic"],
	weight: ["400", "500", "600", "700"],
	variable: "--font-arabic",
	display: "swap",
})

// Latin / digits — Inter is paired with Noto Naskh in most Naskh-default UI.
const inter = Inter({
	subsets: ["latin"],
	variable: "--font-latin",
	display: "swap",
})

export const metadata: Metadata = {
	title: "نظام إدارة المحتوى - الإمام زين العابدين",
	description: "نظام إدارة محتوى الإمام زين العابدين",
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="ar" dir="rtl" className={`${naskh.variable} ${inter.variable}`}>
			<body className="font-arabic">
				<QueryProvider>{children}</QueryProvider>
			</body>
		</html>
	)
}
