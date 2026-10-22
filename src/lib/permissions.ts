import { useAuthStore } from "@/store/auth"

/**
 * True when the signed-in user holds ANY of the given permission strings
 * (`<resource>:<action>`, from the JWT-backed `/auth/me` payload).
 *
 * This only decides what to show. The server enforces every permission, so a
 * stale `false` costs a hidden button, never a security hole. Returns `false`
 * while the user is still loading — use it to reveal optional controls, not to
 * gate whole pages (the sidebar fails open for that).
 */
export function useHasPermission(...permissions: string[]): boolean {
	const held = useAuthStore((s) => s.user?.permissions)
	return !!held && permissions.some((p) => held.includes(p))
}
