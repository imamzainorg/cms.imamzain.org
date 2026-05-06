import type { Metadata } from "next"
import { Cairo } from "next/font/google"
import "./globals.css"

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo" })

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
		<html lang="ar" dir="rtl">
			<body className={cairo.className}>
				{children}
			</body>
		</html>
	)
}
