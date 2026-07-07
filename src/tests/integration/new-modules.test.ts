import { describe, it, expect } from "vitest"
import { http, HttpResponse } from "msw"
// The SHARED server from setup.ts — registering a second setupServer here
// would stack a second interceptor layer and double-dispatch every request.
import { server } from "../mocks/server"
import { staticPagesService } from "@/services/static-pages.service"
import { storesService } from "@/services/stores.service"
import {
	audiosService,
	AudioSizeExceededError,
	AudioMimeNotAllowedError,
} from "@/services/audios.service"
import { speakersService } from "@/services/speakers.service"
import { getErrorMessage } from "@/lib/api"
import { api } from "@/lib/api"

const API = "http://localhost:3000/api/v1"
const R2 = "http://localhost:3000/r2-upload"
function wrap<T>(data: T) { return { success: true, timestamp: new Date().toISOString(), message: "OK", data } }
function paginated<T>(items: T[]) {
	return { items, pagination: { page: 1, limit: 20, total: items.length, pages: 1 } }
}

const mockStaticPage = {
	id: "sp1",
	display_order: 0,
	is_published: false,
	created_at: "2026-01-01T00:00:00Z",
	updated_at: "2026-01-01T00:00:00Z",
	static_page_translations: [
		{ lang: "ar", title: "من نحن", slug: "about", body: "<p>نبذة</p>", is_default: true, meta_title: null, meta_description: null, og_image_id: null },
	],
	translation: { lang: "ar", title: "من نحن", slug: "about", body: "<p>نبذة</p>", is_default: true, meta_title: null, meta_description: null, og_image_id: null },
}

const mockStore = {
	id: "st1",
	display_order: 0,
	created_at: "2026-01-01T00:00:00Z",
	updated_at: "2026-01-01T00:00:00Z",
	store_translations: [{ lang: "ar", city_name: "كربلاء" }],
	translation: { lang: "ar", city_name: "كربلاء" },
	store_locations: [],
}

const mockSpeaker = {
	id: "sk1",
	created_at: "2026-01-01T00:00:00Z",
	updated_at: "2026-01-01T00:00:00Z",
	speaker_translations: [{ lang: "ar", name: "الشيخ فلان", is_default: true }],
	translation: { lang: "ar", name: "الشيخ فلان", is_default: true },
	audio_count: 3,
}

const mockAudio = {
	id: "au1",
	speaker_id: "sk1",
	audio_url: "https://cdn.example.org/audio/lecture.mp3",
	pdf_url: null,
	slug: null,
	duration_seconds: 60,
	size_mb: 1.2,
	is_published: false,
	created_at: "2026-01-01T00:00:00Z",
	updated_at: "2026-01-01T00:00:00Z",
	audio_translations: [{ lang: "ar", title: "محاضرة", is_default: true }],
	translation: { lang: "ar", title: "محاضرة", is_default: true },
	speaker: mockSpeaker,
}

describe("staticPagesService", () => {
	it("lists through the ADMIN endpoint with is_published passed through", async () => {
		let capturedPublished: string | null = null
		server.use(http.get(`${API}/static-pages/admin`, ({ request }) => {
			capturedPublished = new URL(request.url).searchParams.get("is_published")
			return HttpResponse.json(wrap(paginated([mockStaticPage])))
		}))
		const { data } = await staticPagesService.list({ is_published: false })
		expect(capturedPublished).toBe("false")
		expect(data.items[0].static_page_translations[0].slug).toBe("about")
	})

	it("fetches detail through the ADMIN route (public :id 404s on drafts)", async () => {
		server.use(http.get(`${API}/static-pages/admin/sp1`, () =>
			HttpResponse.json(wrap(mockStaticPage)),
		))
		const { data } = await staticPagesService.get("sp1")
		expect(data.id).toBe("sp1")
	})

	it("toggles publish via PATCH /:id/publish with { is_published }", async () => {
		let body: unknown
		server.use(http.patch(`${API}/static-pages/sp1/publish`, async ({ request }) => {
			body = await request.json()
			return HttpResponse.json(wrap({ ...mockStaticPage, is_published: true }))
		}))
		await staticPagesService.togglePublish("sp1", true)
		expect(body).toEqual({ is_published: true })
	})

	it("uses /trash and /:id/restore", async () => {
		server.use(
			http.get(`${API}/static-pages/trash`, () => HttpResponse.json(wrap(paginated([mockStaticPage])))),
			http.post(`${API}/static-pages/sp1/restore`, () => HttpResponse.json(wrap(null))),
		)
		const { data } = await staticPagesService.trash()
		expect(data.items).toHaveLength(1)
		await expect(staticPagesService.restore("sp1")).resolves.toBeTruthy()
	})
})

describe("storesService", () => {
	it("manages sale points through the nested /locations routes", async () => {
		const hits: string[] = []
		server.use(
			http.post(`${API}/stores/st1/locations`, () => {
				hits.push("create")
				return HttpResponse.json(wrap(mockStore), { status: 201 })
			}),
			http.patch(`${API}/stores/st1/locations/loc1`, () => {
				hits.push("update")
				return HttpResponse.json(wrap(mockStore))
			}),
			http.delete(`${API}/stores/st1/locations/loc1`, () => {
				hits.push("delete")
				return HttpResponse.json(wrap(mockStore))
			}),
		)
		await storesService.addLocation("st1", {
			translations: [{ lang: "ar", name: "منفذ", address: "شارع" }],
		})
		await storesService.updateLocation("st1", "loc1", { phone: "0770" })
		await storesService.removeLocation("st1", "loc1")
		expect(hits).toEqual(["create", "update", "delete"])
	})

	it("uses /trash and /:id/restore", async () => {
		server.use(
			http.get(`${API}/stores/trash`, () => HttpResponse.json(wrap(paginated([mockStore])))),
			http.post(`${API}/stores/st1/restore`, () => HttpResponse.json(wrap(null))),
		)
		const { data } = await storesService.trash()
		expect(data.items[0].translation?.city_name).toBe("كربلاء")
		await expect(storesService.restore("st1")).resolves.toBeTruthy()
	})
})

describe("speakersService", () => {
	it("creates with a translations-only body and reads audio_count", async () => {
		let body: unknown
		server.use(
			http.post(`${API}/speakers`, async ({ request }) => {
				body = await request.json()
				return HttpResponse.json(wrap(mockSpeaker), { status: 201 })
			}),
		)
		const { data } = await speakersService.create({
			translations: [{ lang: "ar", name: "الشيخ فلان", is_default: true }],
		})
		expect(body).toEqual({ translations: [{ lang: "ar", name: "الشيخ فلان", is_default: true }] })
		expect(data.audio_count).toBe(3)
	})

	it("uses /trash and /:id/restore", async () => {
		server.use(
			http.get(`${API}/speakers/trash`, () => HttpResponse.json(wrap(paginated([mockSpeaker])))),
			http.post(`${API}/speakers/sk1/restore`, () => HttpResponse.json(wrap(null))),
		)
		const { data } = await speakersService.trash()
		expect(data.items).toHaveLength(1)
		await expect(speakersService.restore("sk1")).resolves.toBeTruthy()
	})
})

describe("audiosService", () => {
	it("lists and reads details through the ADMIN routes", async () => {
		let capturedSpeaker: string | null = null
		server.use(
			http.get(`${API}/audios/admin`, ({ request }) => {
				capturedSpeaker = new URL(request.url).searchParams.get("speaker_id")
				return HttpResponse.json(wrap(paginated([mockAudio])))
			}),
			http.get(`${API}/audios/admin/au1`, () => HttpResponse.json(wrap(mockAudio))),
		)
		const { data } = await audiosService.list({ speaker_id: "sk1" })
		expect(capturedSpeaker).toBe("sk1")
		expect(data.items[0].translation?.title).toBe("محاضرة")
		const { data: detail } = await audiosService.get("au1")
		expect(detail.speaker?.translation?.name).toBe("الشيخ فلان")
	})

	it("toggles publish via PATCH /:id/publish", async () => {
		let body: unknown
		server.use(http.patch(`${API}/audios/au1/publish`, async ({ request }) => {
			body = await request.json()
			return HttpResponse.json(wrap({ ...mockAudio, is_published: true }))
		}))
		await audiosService.togglePublish("au1", true)
		expect(body).toEqual({ is_published: true })
	})

	it("uploads via pre-signed PUT with the declared content_type and NO confirm step", async () => {
		let uploadUrlBody: unknown
		let putContentType: string | null = null
		server.use(
			http.post(`${API}/audios/upload-url`, async ({ request }) => {
				uploadUrlBody = await request.json()
				return HttpResponse.json(wrap({
					uploadUrl: `${R2}/audio-key`,
					key: "audio/lecture.mp3",
					publicUrl: "https://cdn.example.org/audio/lecture.mp3",
					maxBytes: 314572800,
				}))
			}),
			http.put(`${R2}/audio-key`, ({ request }) => {
				putContentType = request.headers.get("content-type")
				return new HttpResponse(null, { status: 200 })
			}),
		)
		// Empty file.type — the service must fall back to the .mp3 extension.
		const file = new File([new Uint8Array(64)], "lecture.mp3", { type: "" })
		const { publicUrl } = await audiosService.uploadAudioFile(file, "audio")
		expect(uploadUrlBody).toEqual({ filename: "lecture.mp3", content_type: "audio/mpeg" })
		expect(putContentType).toBe("audio/mpeg")
		expect(publicUrl).toBe("https://cdn.example.org/audio/lecture.mp3")
	})

	it("rejects oversized files BEFORE the PUT", async () => {
		let putHit = false
		server.use(
			http.post(`${API}/audios/upload-url`, () =>
				HttpResponse.json(wrap({
					uploadUrl: `${R2}/audio-key`,
					key: "audio/big.mp3",
					publicUrl: "https://cdn.example.org/audio/big.mp3",
					maxBytes: 10, // tiny advisory cap
				})),
			),
			http.put(`${R2}/audio-key`, () => {
				putHit = true
				return new HttpResponse(null, { status: 200 })
			}),
		)
		const file = new File([new Uint8Array(64)], "big.mp3", { type: "audio/mpeg" })
		await expect(audiosService.uploadAudioFile(file, "audio")).rejects.toBeInstanceOf(AudioSizeExceededError)
		expect(putHit).toBe(false)
	})

	it("rejects disallowed MIME types without any network call", async () => {
		const file = new File([new Uint8Array(8)], "notes.txt", { type: "text/plain" })
		await expect(audiosService.uploadAudioFile(file, "audio")).rejects.toBeInstanceOf(AudioMimeNotAllowedError)
		await expect(audiosService.uploadAudioFile(file, "pdf")).rejects.toBeInstanceOf(AudioMimeNotAllowedError)
	})

	it("uses /trash and /:id/restore", async () => {
		server.use(
			http.get(`${API}/audios/trash`, () => HttpResponse.json(wrap(paginated([mockAudio])))),
			http.post(`${API}/audios/au1/restore`, () => HttpResponse.json(wrap(null))),
		)
		const { data } = await audiosService.trash()
		expect(data.items).toHaveLength(1)
		await expect(audiosService.restore("au1")).resolves.toBeTruthy()
	})
})

describe("getErrorMessage — stable error-code mapping", () => {
	it("maps RATE_LIMITED to the Arabic throttle message", async () => {
		server.use(http.get(`${API}/limited`, () =>
			HttpResponse.json({ success: false, code: "RATE_LIMITED", error: "ThrottlerException: Too Many Requests" }, { status: 429 }),
		))
		try { await api.get("/limited") } catch (e) {
			expect(getErrorMessage(e, "fb")).toBe("طلبات كثيرة خلال وقت قصير — انتظر قليلاً ثم أعد المحاولة.")
		}
	})

	it("joins errors[] for VALIDATION_FAILED instead of the generic error string", async () => {
		server.use(http.get(`${API}/invalid`, () =>
			HttpResponse.json({
				success: false,
				code: "VALIDATION_FAILED",
				error: "Validation failed",
				errors: ["title must not be empty", "slug must match pattern"],
			}, { status: 400 }),
		))
		try { await api.get("/invalid") } catch (e) {
			expect(getErrorMessage(e, "fb")).toBe("title must not be empty، slug must match pattern")
		}
	})

	it("prefers the server string for PAYLOAD_TOO_LARGE (it names the cap + MIME)", async () => {
		server.use(http.get(`${API}/big`, () =>
			HttpResponse.json({ success: false, code: "PAYLOAD_TOO_LARGE", error: "File exceeds the 25 MB limit for image/jpeg" }, { status: 413 }),
		))
		try { await api.get("/big") } catch (e) {
			expect(getErrorMessage(e, "fb")).toBe("File exceeds the 25 MB limit for image/jpeg")
		}
	})

	it("does NOT map a login 401 to the session-expired message", async () => {
		server.use(http.post(`${API}/auth/login`, () =>
			HttpResponse.json({ success: false, code: "UNAUTHORIZED", error: "Invalid credentials" }, { status: 401 }),
		))
		try { await api.post("/auth/login", { username: "x", password: "y" }) } catch (e) {
			expect(getErrorMessage(e, "fb")).toBe("Invalid credentials")
		}
	})

	it("maps a non-login 401 UNAUTHORIZED to session-expired", async () => {
		server.use(http.get(`${API}/needs-auth`, () =>
			HttpResponse.json({ success: false, code: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 }),
		))
		try { await api.get("/needs-auth") } catch (e) {
			expect(getErrorMessage(e, "fb")).toBe("انتهت الجلسة — سجّل الدخول مجددًا.")
		}
	})
})
