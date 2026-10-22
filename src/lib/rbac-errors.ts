import { getErrorMessage, getErrorStatus, getServerErrorText } from "@/lib/api"

/**
 * Error text for the account/role administration screens (users, roles).
 *
 * Besides the usual permission check the API enforces two invariants that
 * answer with a generic 403/409, so the default wording would mislead:
 *  - privilege envelope (403): you can only manage a user or role whose
 *    permissions are all within your own — equal sets pass;
 *  - last administrator (409): at least one active user must always hold
 *    every permission, otherwise nobody could grant a permission again.
 */
export function getAccountAdminErrorMessage(error: unknown, fallback: string): string {
	const status = getErrorStatus(error)
	if (status === 403) {
		return "ليس لديك صلاحية لهذا الإجراء — ولا يمكنك إدارة حساب أو دور يملك صلاحيات لا تملكها أنت."
	}
	if (status === 409 && /every permission/i.test(getServerErrorText(error) ?? "")) {
		return "هذا التغيير سيترك النظام بلا أي مستخدم فعّال يملك كل الصلاحيات — امنح حساباً آخر كل الصلاحيات أولاً ثم أعد المحاولة."
	}
	return getErrorMessage(error, fallback)
}
