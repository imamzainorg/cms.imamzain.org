import ClientOnly from "@/components/layout/ClientOnly"
import DashboardLayoutInner from "./DashboardLayoutInner"

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<ClientOnly>
			<DashboardLayoutInner>{children}</DashboardLayoutInner>
		</ClientOnly>
	)
}