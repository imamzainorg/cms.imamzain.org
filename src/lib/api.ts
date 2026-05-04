import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"

export const api = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
})

api.interceptors.request.use((config) => {
	if (typeof window !== "undefined") {
		const token = localStorage.getItem("accessToken")
		if (token) {
			config.headers.Authorization = `Bearer ${token}`
		}
	}
	return config
})

api.interceptors.response.use(
	(response) => {
		// Unwrap the API envelope: { success, timestamp, message, data: <payload> }
		// so every caller receives the actual payload in response.data
		const d = response.data
		if (
			d !== null &&
			typeof d === "object" &&
			"success" in d &&
			"data" in d
		) {
			response.data = d.data
		}
		return response
	},
	(error) => {
		if (error.response?.status === 401 && typeof window !== "undefined") {
			localStorage.removeItem("accessToken")
			try {
				window.location.href = "/login"
			} catch {
				// jsdom in test environments does not support navigation
			}
		}
		return Promise.reject(error)
	}
)