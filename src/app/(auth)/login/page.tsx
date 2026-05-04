"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth"
import { toast, Toaster } from "sonner"
import { AxiosError } from "axios"
import { Loader2, Lock, User } from "lucide-react"

function extractMessage(error: unknown): string {
	if (error instanceof AxiosError) {
		const d = error.response?.data
		if (!d) return `Network error (${error.code ?? "no response"})`
		const msg = d.message
		if (Array.isArray(msg)) return msg.join(" · ")
		if (typeof msg === "string" && msg) return msg
		// Surface the whole object so we can see what the API returned
		return `HTTP ${error.response?.status}: ${JSON.stringify(d).slice(0, 120)}`
	}
	if (error instanceof Error) return error.message
	return "Login failed"
}

export default function LoginPage() {
	const router = useRouter()
	const login = useAuthStore((state) => state.login)
	const [username, setUsername] = useState("")
	const [password, setPassword] = useState("")
	const [isLoading, setIsLoading] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		try {
			await login(username, password)
			toast.success("Login successful!")
			router.push("/dashboard")
		} catch (error: unknown) {
			console.error("[login] error:", error)
			toast.error(extractMessage(error))
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<>
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
				<div className="max-w-md w-full space-y-8">
					<div className="text-center">
						<div className="mx-auto h-16 w-16 bg-primary rounded-xl flex items-center justify-center shadow-lg">
							<Lock className="h-8 w-8 text-white" />
						</div>
						<h2 className="mt-6 text-3xl font-bold text-gray-900">Imam Zain CMS</h2>
						<p className="mt-2 text-sm text-gray-600">Sign in to manage your content</p>
					</div>

					<div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">
						<form className="space-y-6" onSubmit={handleSubmit}>
							<div className="space-y-4">
								<div>
									<label htmlFor="username" className="block text-sm font-medium text-gray-700">
										Username
									</label>
									<div className="mt-1 relative">
										<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
											<User className="h-5 w-5 text-gray-400" />
										</div>
										<input
											id="username"
											type="text"
											autoComplete="username"
											required
											value={username}
											onChange={(e) => setUsername(e.target.value)}
											className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
											placeholder="admin"
										/>
									</div>
								</div>

								<div>
									<label htmlFor="password" className="block text-sm font-medium text-gray-700">
										Password
									</label>
									<div className="mt-1 relative">
										<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
											<Lock className="h-5 w-5 text-gray-400" />
										</div>
										<input
											id="password"
											type="password"
											autoComplete="current-password"
											required
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
											placeholder="••••••••"
										/>
									</div>
								</div>
							</div>

							<button
								type="submit"
								disabled={isLoading}
								className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{isLoading ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin" />
										Signing in...
									</>
								) : (
									"Sign in"
								)}
							</button>
						</form>
					</div>

					<p className="text-center text-xs text-gray-500">
						{new Date().getFullYear()} Imam Zain Alabideen. All rights reserved.
					</p>
				</div>
			</div>
			<Toaster position="top-center" />
		</>
	)
}