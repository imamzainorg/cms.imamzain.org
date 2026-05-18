/**
 * Minimal `next/navigation` mock for vitest. Returns a stub router whose
 * push/replace/back can be spied on, and an empty searchParams.
 */
import { vi } from "vitest"

export const mockPush = vi.fn()
export const mockReplace = vi.fn()
export const mockBack = vi.fn()
export const mockRefresh = vi.fn()

export const navigationMock = {
	useRouter: () => ({
		push: mockPush,
		replace: mockReplace,
		back: mockBack,
		refresh: mockRefresh,
		prefetch: vi.fn(),
		forward: vi.fn(),
	}),
	useSearchParams: () => new URLSearchParams(),
	usePathname: () => "/dashboard",
	useParams: () => ({}),
	redirect: vi.fn(),
	notFound: vi.fn(),
}

export function resetNavigationMocks() {
	mockPush.mockReset()
	mockReplace.mockReset()
	mockBack.mockReset()
	mockRefresh.mockReset()
}
