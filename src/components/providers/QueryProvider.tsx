"use client"

import { useEffect, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { setAuthFailureHandler } from "@/lib/api"

export default function QueryProvider({ children }: { children: React.ReactNode }) {
	const [client] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 30_000,
						gcTime: 5 * 60_000,
						refetchOnWindowFocus: false,
						retry: 1,
					},
					mutations: {
						retry: 0,
					},
				},
			}),
	)

	// Wire the api module's session-over callback to a hard navigation —
	// the user is in a refresh-failed state, we want a clean /login mount
	// (state stores, query cache, all dropped). The try/catch is for jsdom
	// + sandboxed iframes that throw on navigation; the tokens are already
	// wiped at this point so there's nothing else to do.
	useEffect(() => {
		setAuthFailureHandler(() => {
			try {
				window.location.replace("/login")
			} catch {
				/* navigation not available */
			}
		})
		return () => setAuthFailureHandler(null)
	}, [])

	return (
		<QueryClientProvider client={client}>
			{children}
			{process.env.NODE_ENV === "development" && (
				<ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
			)}
		</QueryClientProvider>
	)
}
