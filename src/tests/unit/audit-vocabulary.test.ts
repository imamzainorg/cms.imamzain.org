import { describe, it, expect } from "vitest"
import { AUDIT_ACTION_GROUPS, AUDIT_RESOURCE_OPTIONS, specialAuditLabel } from "@/lib/audit-vocabulary"
import { humanizeAuditAction, humanizeResource } from "@/lib/humanize"

const allActions = AUDIT_ACTION_GROUPS.flatMap((g) => g.options.map((o) => o.value))

describe("audit filter vocabulary", () => {
	it("offers the exact stored action literals (the API matches action exactly)", () => {
		// The old dropdown sent CREATE / UPDATE / LOGIN, which no row ever has.
		for (const loose of ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "UPLOAD"]) {
			expect(allActions).not.toContain(loose)
		}
		for (const real of [
			"USER_LOGIN",
			"USER_LOGIN_FAILED",
			"USER_LOGOUT_ALL",
			"REFRESH_TOKEN_REUSE_DETECTED",
			"POST_CREATED",
			"POST_UNPUBLISHED",
			"ACADEMIC_PAPER_RESTORED",
			"GALLERY_IMAGE_PUBLISHED",
			"DAILY_HADITH_DELETED",
			"HIJRI_DATE_SET",
			"NEWSLETTER_SUBSCRIBE_REQUESTED",
		]) {
			expect(allActions).toContain(real)
		}
	})

	it("has no duplicate values and every option is labelled", () => {
		expect(new Set(allActions).size).toBe(allActions.length)
		for (const g of AUDIT_ACTION_GROUPS) {
			for (const o of g.options) expect(o.label, o.value).toBeTruthy()
		}
	})

	it("uses the stored resource_type strings (underscored, not hyphenated)", () => {
		const values = AUDIT_RESOURCE_OPTIONS.map((o) => o.value)
		expect(values).toContain("academic_paper")
		expect(values).toContain("gallery_image")
		expect(values).toContain("contact_submission")
		expect(values).toContain("proxy_visit_request")
		expect(values).not.toContain("academic-paper")
		expect(values).not.toContain("gallery")
	})

	it("every resource_type has an Arabic label in the feed (never the raw code)", () => {
		for (const { value } of AUDIT_RESOURCE_OPTIONS) {
			const label = humanizeResource(value)
			expect(label, value).not.toBe(value)
		}
		expect(humanizeResource("hijri_date")).toBe("التاريخ الهجري")
	})
})

describe("specialAuditLabel", () => {
	it("never reads a failed login as a login", () => {
		const label = specialAuditLabel({ action: "USER_LOGIN_FAILED", changes: { reason: "bad_password" } })
		expect(label).toContain("فاشلة")
		expect(label).toContain("كلمة مرور خاطئة")
		// Whereas the generic humanizer would have said "logged in a user".
		expect(humanizeAuditAction("USER_LOGIN_FAILED").label).toContain("سجّل الدخول")
	})

	it("explains why a login failed without storing the attempted name", () => {
		expect(specialAuditLabel({ action: "USER_LOGIN_FAILED", changes: { reason: "locked" } })).toContain("مقفل")
		expect(specialAuditLabel({ action: "USER_LOGIN_FAILED", changes: { reason: "unknown_username" } })).toContain("غير معروف")
		expect(specialAuditLabel({ action: "USER_LOGIN_FAILED", changes: null })).toBe("محاولة دخول فاشلة")
	})

	it("recognises the cron's scheduled publish (no human did it)", () => {
		expect(specialAuditLabel({ action: "POST_PUBLISHED", changes: { scheduled: true, by: "cron" } })).toContain("تلقائي")
		expect(specialAuditLabel({ action: "POST_PUBLISHED", changes: { method: "PATCH" } })).toBeNull()
	})

	it("leaves ordinary CRUD to the generic phrasing", () => {
		expect(specialAuditLabel({ action: "POST_CREATED", changes: null })).toBeNull()
		expect(humanizeAuditAction("POST_RESTORED").verb).toBe("استعاد")
	})
})
