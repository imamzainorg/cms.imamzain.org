/**
 * Client-side audio metadata extraction (duration + waveform peaks) matching
 * the API integration guide's canonical algorithm. Runs entirely in the
 * browser via Web Audio — the server stores whatever we send, so the peak
 * count / normalization here must stay in sync with the API's MAX_PEAKS cap.
 *
 * Decode failure is non-fatal: duration/size/peaks are optional server-side,
 * so on any error we return zeros/empty and let the upload proceed.
 */

export const PEAK_COUNT = 300

export type AudioMeta = {
	durationSeconds: number
	sizeMB: number
	peaks: number[]
}

export async function extractAudioMeta(file: File): Promise<AudioMeta> {
	const sizeMB = +(file.size / 1048576).toFixed(2)
	if (typeof window === "undefined") {
		return { durationSeconds: 0, sizeMB, peaks: [] }
	}
	try {
		const raw = await file.arrayBuffer()

		// 1. Real AudioContext decode for the duration. `raw.slice(0)` because
		//    decodeAudioData detaches the buffer it's given.
		const ctx = new AudioContext()
		let durationSeconds = 0
		try {
			const decoded = await ctx.decodeAudioData(raw.slice(0))
			durationSeconds = Math.round(decoded.duration)
		} finally {
			await ctx.close()
		}

		// 2. Offline mono 8 kHz re-decode for the waveform — cheap and more than
		//    enough resolution for a 300-point peak strip.
		const offline = new OfflineAudioContext(
			1,
			Math.max(1, Math.ceil(durationSeconds * 8000)),
			8000,
		)
		const buffer = await offline.decodeAudioData(raw)
		const channel = buffer.getChannelData(0)

		// 3. Max-abs per block → PEAK_COUNT points.
		const blockSize = Math.max(1, Math.floor(channel.length / PEAK_COUNT))
		const rawPeaks: number[] = []
		for (let i = 0; i < PEAK_COUNT; i++) {
			const start = i * blockSize
			if (start >= channel.length) break
			const end = Math.min(start + blockSize, channel.length)
			let max = 0
			for (let j = start; j < end; j++) {
				const v = Math.abs(channel[j])
				if (v > max) max = v
			}
			rawPeaks.push(max)
		}

		// 4. Normalize to the 95th percentile (so a single click/pop doesn't
		//    flatten the rest), clamp to [0,1], round to 4 decimals.
		const sorted = [...rawPeaks].sort((a, b) => a - b)
		const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]
		const peaks = rawPeaks.map((p) => {
			const n = p95 > 0 ? p / p95 : 0
			return +Math.min(1, Math.max(0, n)).toFixed(4)
		})

		return { durationSeconds, sizeMB, peaks }
	} catch {
		return { durationSeconds: 0, sizeMB, peaks: [] }
	}
}
