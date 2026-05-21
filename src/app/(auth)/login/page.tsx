"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth"
import { toast, Toaster } from "sonner"
import { Loader2, Lock, User } from "lucide-react"
import Image from "next/image"
import { getErrorMessage } from "@/lib/api"

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
			toast.success("تم تسجيل الدخول بنجاح")
			router.push("/dashboard")
		} catch (error: unknown) {
			toast.error(getErrorMessage(error, "فشل تسجيل الدخول"))
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<>
			<div className="min-h-screen flex relative overflow-hidden body-warmth">
				{/* Left half — emerald ground with eight-pointed star ornament and
				    the institution mark. On small screens this stack collapses
				    to a slim banner above the form. */}
				<aside className="hidden lg:flex lg:w-1/2 relative bg-linear-to-bl from-primary via-[hsl(var(--primary)/0.95)] to-[hsl(var(--primary-strong))] text-white overflow-hidden">
					<div
						className="absolute inset-0 ornament-tile pointer-events-none"
						style={{ opacity: 0.1, filter: "invert(1)" }}
						aria-hidden
					/>
					<div className="pointer-events-none absolute -top-32 -end-24 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />
					<div className="pointer-events-none absolute -bottom-32 -start-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

					<div className="relative z-10 flex flex-col justify-between p-12 w-full">
						<div className="flex items-center gap-3">
							<div className="h-14 w-14 rounded-md bg-white/10 ring-1 ring-white/20 backdrop-blur-sm flex items-center justify-center">
								<Image
									src="/brand/logo/logo-icon-white.png"
									alt=""
									width={56}
									height={56}
									priority
									className="h-9 w-9 object-contain"
								/>
							</div>
							<div className="text-white">
								<p className="text-lg font-semibold leading-tight">مركز إدارة المحتوى</p>
								<p className="text-[12.5px] text-white/75 leading-snug">
									مؤسسة الإمام زين العابدين للبحوث والدراسات
								</p>
							</div>
						</div>

						<div className="max-w-lg">
							<p className="text-[13px] font-medium text-secondary/90 tracking-widest mb-3">
								نظام إدارة المحتوى
							</p>
							<h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-4">
								منصّة لإدارة محتوى المؤسسة بحرفية واحترافية
							</h1>
							<p className="text-white/80 text-[15px] leading-relaxed max-w-md">
								مقالات وكتب وأبحاث، رسائل التواصل، النشرة البريدية، والمسابقات —
								في واجهة واحدة، عربية بالكامل.
							</p>
						</div>

						<p className="text-[11.5px] text-white/60 leading-relaxed">
							© {new Date().getFullYear()} مؤسسة الإمام زين العابدين. جميع الحقوق محفوظة.
						</p>
					</div>
				</aside>

				{/* Right pane — the form. Restrained, centered, single-card. */}
				<main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16 relative">
					<div
						className="absolute inset-0 ornament-tile pointer-events-none lg:hidden"
						style={{ opacity: 0.04 }}
						aria-hidden
					/>
					<div className="relative w-full max-w-md space-y-8 animate-fade-in">
						{/* Mobile-only brand block — the aside is hidden under lg. */}
						<div className="lg:hidden text-center">
							<div className="mx-auto h-16 w-16 rounded-md bg-primary flex items-center justify-center shadow-raise mb-4">
								<Image
									src="/brand/logo/logo-icon-white.png"
									alt=""
									width={56}
									height={56}
									className="h-10 w-10 object-contain"
								/>
							</div>
							<h2 className="text-2xl font-bold text-foreground leading-tight">
								مركز إدارة المحتوى
							</h2>
							<p className="text-[12.5px] text-[hsl(var(--foreground-muted))] mt-1">
								مؤسسة الإمام زين العابدين للبحوث والدراسات
							</p>
						</div>

						<div className="bg-white py-8 px-7 shadow-pop rounded-xl border border-[hsl(var(--border))]">
							<div className="mb-7">
								<h2 className="text-xl font-bold text-foreground">سجّل دخولك</h2>
								<p className="mt-1 text-sm text-[hsl(var(--foreground-muted))]">
									أدخل اسم المستخدم وكلمة المرور للوصول إلى لوحة التحكم.
								</p>
							</div>
							{/* Hairline divider between header and form */}
							<div className="divider-brand mb-6" />

							<form className="space-y-5" onSubmit={handleSubmit}>
								<div>
									<label
										htmlFor="username"
										className="block text-[13px] font-medium text-foreground mb-1"
									>
										اسم المستخدم
									</label>
									<div className="relative group">
										<div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[hsl(var(--foreground-subtle))] group-focus-within:text-primary transition-colors">
											<User className="h-4 w-4" strokeWidth={1.25} />
										</div>
										<input
											id="username"
											type="text"
											autoComplete="username"
											required
											value={username}
											onChange={(e) => setUsername(e.target.value)}
											className="appearance-none block w-full pr-10 pl-3 py-2.5 border border-[hsl(var(--input))] rounded-md text-sm bg-white placeholder:text-[hsl(var(--foreground-subtle))] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
											placeholder="admin"
										/>
									</div>
								</div>

								<div>
									<label
										htmlFor="password"
										className="block text-[13px] font-medium text-foreground mb-1"
									>
										كلمة المرور
									</label>
									<div className="relative group">
										<div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[hsl(var(--foreground-subtle))] group-focus-within:text-primary transition-colors">
											<Lock className="h-4 w-4" strokeWidth={1.25} />
										</div>
										<input
											id="password"
											type="password"
											autoComplete="current-password"
											required
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											className="appearance-none block w-full pr-10 pl-3 py-2.5 border border-[hsl(var(--input))] rounded-md text-sm bg-white placeholder:text-[hsl(var(--foreground-subtle))] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
											placeholder="••••••••"
										/>
									</div>
								</div>

								<button
									type="submit"
									disabled={isLoading}
									className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-md text-sm font-semibold text-white bg-primary hover:bg-[hsl(var(--primary)/0.92)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-soft hover:shadow-raise active:translate-y-px"
								>
									{isLoading ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />
											جارٍ تسجيل الدخول…
										</>
									) : (
										"تسجيل الدخول"
									)}
								</button>
							</form>
						</div>

						<p className="lg:hidden text-center text-[11.5px] text-[hsl(var(--foreground-muted))]">
							© {new Date().getFullYear()} مؤسسة الإمام زين العابدين. جميع الحقوق محفوظة.
						</p>
					</div>
				</main>
			</div>
			<Toaster position="top-center" />
		</>
	)
}
