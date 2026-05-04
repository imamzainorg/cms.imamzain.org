export default function NotFound() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="text-center">
				<h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
				<p className="text-lg text-gray-600 mb-6">Page not found</p>
				<a
					href="/dashboard"
					className="text-primary hover:text-primary/80 font-medium"
				>
					Go to Dashboard
				</a>
			</div>
		</div>
	)
}
