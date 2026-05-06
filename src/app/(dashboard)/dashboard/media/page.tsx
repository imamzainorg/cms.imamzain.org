"use client"

import { useEffect, useState } from "react"
import { mediaService } from "@/services/media.service"
import type { MediaRecord } from "@/types"
import { toast } from "sonner"
import { Copy, Trash2, Loader2, Image as ImageIcon, Search } from "lucide-react"
import { format } from "date-fns"

export default function MediaPage() {
	const [media, setMedia] = useState<MediaRecord[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [page, setPage] = useState(1)
	const [total, setTotal] = useState(0)
	const [search, setSearch] = useState("")

	useEffect(() => { loadMedia() }, [page])

	const loadMedia = async () => {
		setIsLoading(true)
		try {
			const { data } = await mediaService.list({ page, limit: 20 })
			setMedia(data.items)
			setTotal(data.pagination.total)
		} catch { toast.error("فشل تحميل الوسائط") }
		finally { setIsLoading(false) }
	}

	const handleDelete = async (id: string) => {
		if (!confirm("هل تريد حذف هذا الملف؟ قد يفشل الحذف إذا كان مستخدماً في المحتوى.")) return
		try { await mediaService.remove(id); toast.success("تم الحذف"); loadMedia() }
		catch { toast.error("لا يمكن الحذف — الملف مستخدم في المحتوى") }
	}

	const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("تم النسخ") }
	const formatSize = (b: number) => { const k = 1024, s = ["B","KB","MB","GB"], i = Math.floor(Math.log(b)/Math.log(k)); return parseFloat((b/Math.pow(k,i)).toFixed(2))+" "+s[i] }

	const filtered = media.filter((m) => m.filename.toLowerCase().includes(search.toLowerCase()))

	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

	return (
		<div>
			<h1 className="text-3xl font-bold text-gray-900 mb-6">مكتبة الوسائط</h1>
			<div className="relative mb-6">
				<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
				<input type="text" placeholder="ابحث باسم الملف..." value={search} onChange={(e) => setSearch(e.target.value)}
					className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
			</div>
			<div className="bg-white shadow-sm rounded-lg overflow-hidden">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">معاينة</th>
							<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">اسم الملف</th>
							<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحجم</th>
							<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الأبعاد</th>
							<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الرفع</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{filtered.length === 0 ? (
							<tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500"><ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" /><p>لا توجد وسائط</p></td></tr>
						) : filtered.map((m) => (
							<tr key={m.id} className="hover:bg-gray-50">
								<td className="px-4 py-3"><img src={m.url} alt={m.alt_text || m.filename} className="h-12 w-12 object-cover rounded" /></td>
								<td className="px-4 py-3 text-sm text-gray-900">{m.filename}</td>
								<td className="px-4 py-3 text-sm text-gray-500">{formatSize(m.file_size)}</td>
								<td className="px-4 py-3 text-sm text-gray-500">{m.width && m.height ? `${m.width}×${m.height}` : "—"}</td>
								<td className="px-4 py-3 text-sm text-gray-500">{m.created_at ? format(new Date(m.created_at), "dd/MM/yyyy") : "—"}</td>
								<td className="px-4 py-3 text-left text-sm font-medium">
									<button onClick={() => copy(m.id)} className="text-primary hover:text-primary/80 ml-3" title="نسخ المعرّف"><Copy className="h-4 w-4" /></button>
									<button onClick={() => handleDelete(m.id)} className="text-red-600 hover:text-red-900" title="حذف"><Trash2 className="h-4 w-4" /></button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{total > 20 && (
				<div className="mt-4 flex justify-between items-center">
					<p className="text-sm text-gray-500">عرض {media.length} من {total}</p>
					<div className="flex gap-2">
						<button onClick={() => setPage(page-1)} disabled={page===1} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50">السابق</button>
						<button onClick={() => setPage(page+1)} disabled={media.length<20} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50">التالي</button>
					</div>
				</div>
			)}
		</div>
	)
}
