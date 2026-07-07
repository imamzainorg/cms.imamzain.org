// Audios + speakers wire shapes. Source of truth:
// api.imamzain.org/src/audios/dto/audio-response.dto.ts
// api.imamzain.org/src/speakers/dto/speaker-response.dto.ts

export type AudioTranslationItem = {
	lang: string
	title: string
	is_default: boolean
}

export type SpeakerTranslationItem = {
	lang: string
	name: string
	is_default: boolean
}

/** Slim speaker embedded on audio rows. */
export type AudioSpeakerRef = {
	id: string
	speaker_translations: SpeakerTranslationItem[]
	translation: SpeakerTranslationItem | null
}

export type Audio = {
	id: string
	speaker_id: string | null
	audio_url: string
	pdf_url: string | null
	/** Single language-agnostic slug (top-level, unlike posts). */
	slug: string | null
	duration_seconds: number | null
	size_mb: number | null
	is_published: boolean
	created_at: string
	updated_at: string
	audio_translations: AudioTranslationItem[]
	translation: AudioTranslationItem | null
	speaker: AudioSpeakerRef | null
	/** Waveform peaks (0–1). Detail endpoint only — dropped from lists. */
	peaks?: number[] | null
}

export type Speaker = {
	id: string
	created_at: string
	updated_at: string
	speaker_translations: SpeakerTranslationItem[]
	translation: SpeakerTranslationItem | null
	/** Count of live published audios attributed to this speaker. */
	audio_count: number
}
