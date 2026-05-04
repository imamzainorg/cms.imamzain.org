"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Loader2, Lock, Shield } from "lucide-react"

export default function SettingsPage() {
	const [isLoading, setIsLoading] = useState(false)
	const [passwords, setPasswords] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	})

	const handlePasswordChange = async (e: React.FormEvent) => {
		e.preventDefault()
		if (passwords.newPassword !== passwords.confirmPassword) {
			toast.error("New passwords do not match")
			return
		}
		if (passwords.newPassword.length < 6) {
			toast.error("Password must be at least 6 characters")
			return
		}
		setIsLoading(true)
		try {
			await api.patch("/auth/me/password", {
				currentPassword: passwords.currentPassword,
				newPassword: passwords.newPassword,
			})
			toast.success("Password changed successfully")
			setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" })
		} catch {
			toast.error("Failed to change password")
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div>
			<h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>

			<div className="flex flex-col lg:flex-row gap-6">
				<div className="lg:w-64">
					<nav className="space-y-1">
						<div className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg bg-primary/10 text-primary">
							<Lock className="h-5 w-5" />
							Password
						</div>
					</nav>

					<div className="mt-8 p-4 bg-blue-50 rounded-lg">
						<div className="flex items-start gap-3">
							<Shield className="h-5 w-5 text-blue-600 mt-0.5" />
							<div>
								<h4 className="text-sm font-medium text-blue-900">Security Tip</h4>
								<p className="text-xs text-blue-700 mt-1">
									Use a strong, unique password and change it regularly.
								</p>
							</div>
						</div>
					</div>
				</div>

				<div className="flex-1">
					<div className="bg-white shadow-sm rounded-lg p-6">
						<h2 className="text-lg font-medium text-gray-900 mb-4">Change Password</h2>
						<form onSubmit={handlePasswordChange} className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700">
									Current Password
								</label>
								<input
									type="password"
									value={passwords.currentPassword}
									onChange={(e) =>
										setPasswords({ ...passwords, currentPassword: e.target.value })
									}
									required
									className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700">
									New Password
								</label>
								<input
									type="password"
									value={passwords.newPassword}
									onChange={(e) =>
										setPasswords({ ...passwords, newPassword: e.target.value })
									}
									required
									minLength={6}
									className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
								/>
								<p className="mt-1 text-xs text-gray-500">Minimum 6 characters</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700">
									Confirm New Password
								</label>
								<input
									type="password"
									value={passwords.confirmPassword}
									onChange={(e) =>
										setPasswords({ ...passwords, confirmPassword: e.target.value })
									}
									required
									className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
								/>
							</div>
							<div className="pt-2">
								<button
									type="submit"
									disabled={isLoading}
									className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
								>
									{isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
									Change Password
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	)
}