"use client"

import { useEffect, useState, useMemo } from "react"
import type { Contact } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { safeFormat } from "@/lib/dates"
import { buildWebmailComposeUrl } from "@/lib/webmail"
import Badge from "@/components/ui/Badge"
import RichTextEditor from "@/components/ui/RichTextEditor"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import {
	Mail, MailOpen, AlertCircle, ShieldAlert, Search, Send, Trash2, Reply, Inbox, Archive,
} from "lucide-react"
import { ListSkeleton } from "@/components/ui/Skeleton"
import {
	useContactsList,
	useContactCount,
	useUpdateContact,
	useDeleteContact,
} from "@/lib/queries/contacts"

type Filter = "" | "NEW" | "RESPONDED" | "SPAM"

const STATUS_LABEL: Record<Contact["status"], string> = {
	NEW: "جديدة",
	RESPONDED: "تم الرد",
	SPAM: "مزعجة",
}

const STATUS_VARIANT: Record<Contact["status"], "info" | "success" | "default"> = {
	NEW: "info",
	RESPONDED: "success",
	SPAM: "default",
}

/**
 * Contacts inbox.
 *
 * NOTE on replies: the backend currently only exposes status changes (NEW / RESPONDED / SPAM)
 * via PATCH /forms/contacts/:id. There is no "send reply email" endpoint. The reply UI here
 * lets the editor draft a response and copy it to clipboard / open in their mail client via
 * mailto: — submitting marks the contact as RESPONDED. When the API gains a real send endpoint,
 * wire `sendReply` below to it.
 */
export default function ContactsPage() {
	const [filter, setFilter] = useState<Filter>("")
	const [search, setSearch] = useState("")
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const { confirm, dialog } = useConfirm()

	const newCount = useContactCount({ status: "NEW" })
	const respondedCount = useContactCount({ status: "RESPONDED" })
	const spamCount = useContactCount({ status: "SPAM" })

	const contactsQuery = useContactsList({
		status: filter || undefined,
		limit: 100,
	})
	const contacts = useMemo(() => contactsQuery.data?.items ?? [], [contactsQuery.data])
	const loading = contactsQuery.isLoading

	const updateContact = useUpdateContact()
	const deleteContact = useDeleteContact()

	useEffect(() => {
		if (contactsQuery.error) toast.error(getErrorMessage(contactsQuery.error, "فشل تحميل الرسائل"))
	}, [contactsQuery.error])

	// Derive `selected` from the live contacts list so it stays in sync with refetches
	const selected = selectedId ? contacts.find((c) => c.id === selectedId) ?? null : null

	const updateStatus = (id: string, status: Contact["status"]) => {
		updateContact.mutate(
			{ id, body: { status } },
			{
				onSuccess: () => toast.success("تم التحديث"),
				onError: (e) => toast.error(getErrorMessage(e, "فشل التحديث")),
			},
		)
	}

	const handleDelete = async (id: string) => {
		const ok = await confirm({
			title: "حذف هذه الرسالة نهائياً؟",
			description: "لا يمكن استرجاع الرسالة بعد الحذف.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		deleteContact.mutate(id, {
			onSuccess: () => {
				toast.success("تم الحذف")
				if (selectedId === id) setSelectedId(null)
			},
			onError: (e) => toast.error(getErrorMessage(e, "فشل الحذف")),
		})
	}

	const filtered = useMemo(() => {
		const byStatus = filter ? contacts.filter((c) => c.status === filter) : contacts
		const q = search.trim().toLowerCase()
		if (!q) return byStatus
		return byStatus.filter((c) =>
			c.name.toLowerCase().includes(q) ||
			c.email.toLowerCase().includes(q) ||
			c.message.toLowerCase().includes(q)
		)
	}, [contacts, search, filter])

	const tabs: Array<{ key: Filter; label: string; icon: typeof Inbox; badge?: number }> = [
		{ key: "", label: "صندوق الوارد", icon: Inbox, badge: (newCount.data ?? 0) + (respondedCount.data ?? 0) },
		{ key: "NEW", label: "جديدة", icon: AlertCircle, badge: newCount.data ?? 0 },
		{ key: "RESPONDED", label: "تم الرد", icon: MailOpen, badge: respondedCount.data ?? 0 },
		{ key: "SPAM", label: "مزعجة", icon: ShieldAlert, badge: spamCount.data ?? 0 },
	]

	return (
		<div>
			<h1 className="text-3xl font-bold text-gray-900 mb-6">رسائل التواصل</h1>

			<div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-[calc(100vh-180px)] flex">
				{/* Sidebar: folders */}
				<div className="w-56 border-l border-gray-200 bg-gray-50/50 flex flex-col">
					<div className="p-3 space-y-1">
						{tabs.map((t) => {
							const active = filter === t.key
							return (
								<button
									key={t.key}
									onClick={() => { setFilter(t.key); setSelectedId(null) }}
									className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${active ? "bg-primary text-white" : "text-gray-700 hover:bg-white"}`}
								>
									<span className="flex items-center gap-2">
										<t.icon className="h-4 w-4" />
										{t.label}
									</span>
									{t.badge !== undefined && t.badge > 0 && (
										<span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"}`}>
											{t.badge}
										</span>
									)}
								</button>
							)
						})}
					</div>
				</div>

				{/* Message list */}
				<div className={`${selected ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 border-l border-gray-200`}>
					<div className="p-3 border-b border-gray-100">
						<div className="relative">
							<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="ابحث في الرسائل..."
								className="w-full pr-9 pl-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
							/>
						</div>
					</div>
					<div className="flex-1 overflow-y-auto">
						{loading ? (
							<ListSkeleton rows={6} />
						) : filtered.length === 0 ? (
							<div className="text-center py-12 text-gray-500">
								<Mail className="h-10 w-10 mx-auto mb-2 text-gray-300" />
								<p className="text-sm">لا توجد رسائل</p>
							</div>
						) : filtered.map((c) => {
							const isSel = selected?.id === c.id
							const isUnread = c.status === "NEW"
							return (
								<button
									key={c.id}
									onClick={() => setSelectedId(c.id)}
									className={`w-full text-right px-4 py-3 border-b border-gray-100 transition-colors ${isSel ? "bg-primary/5 border-r-4 border-r-primary" : "hover:bg-gray-50"}`}
								>
									<div className="flex items-start justify-between gap-2 mb-1">
										<div className="flex items-center gap-2 min-w-0">
											<div className={`w-8 h-8 rounded-full ${isUnread ? "bg-primary text-white" : "bg-gray-200 text-gray-600"} flex items-center justify-center text-xs font-bold shrink-0`}>
												{c.name[0]?.toUpperCase()}
											</div>
											<div className="min-w-0">
												<p className={`text-sm truncate ${isUnread ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>{c.name}</p>
												<p className="text-xs text-gray-500 truncate" dir="ltr">{c.email}</p>
											</div>
										</div>
										<span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">
											{safeFormat(c.submitted_at ?? c.created_at, "dd/MM")}
										</span>
									</div>
									<p className="text-xs text-gray-600 line-clamp-2 mr-10">{c.message}</p>
								</button>
							)
						})}
					</div>
				</div>

				{/* Detail / reply */}
				<div className={`${selected ? "flex" : "hidden md:flex"} flex-col flex-1 bg-white`}>
					{!selected ? (
						<div className="flex-1 flex flex-col items-center justify-center text-gray-500">
							<Mail className="h-16 w-16 mb-3 text-gray-300" />
							<p>اختر رسالة لقراءتها</p>
						</div>
					) : (
						<ContactReadingPane
							key={selected.id}
							contact={selected}
							onStatus={(s) => updateStatus(selected.id, s)}
							onDelete={() => handleDelete(selected.id)}
							onClose={() => setSelectedId(null)}
						/>
					)}
				</div>
			</div>
			{dialog}
		</div>
	)
}

function ContactReadingPane({
	contact,
	onStatus,
	onDelete,
	onClose,
}: {
	contact: Contact
	onStatus: (s: Contact["status"]) => void
	onDelete: () => void
	onClose: () => void
}) {
	const [reply, setReply] = useState("")
	const [showReply, setShowReply] = useState(false)

	const sendReply = () => {
		// API doesn't expose "send email" — open the editor's webmail (Hostinger
		// Roundcube by default) with the prefilled compose. We open a new tab so
		// the CMS state survives the navigation; the editor lands in webmail's
		// compose view (after login if needed).
		const plain = reply.replace(/<[^>]+>/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
		const url = buildWebmailComposeUrl({
			to: contact.email,
			subject: "رد: رسالتك إلى موقع الإمام زين العابدين",
			body: plain,
		})
		window.open(url, "_blank", "noopener,noreferrer")
		onStatus("RESPONDED")
		setShowReply(false)
		setReply("")
	}

	return (
		<>
			<div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
				<div className="min-w-0">
					<button onClick={onClose} className="md:hidden text-sm text-gray-500 mb-2">← الرجوع</button>
					<h2 className="text-lg font-semibold text-gray-900 truncate">رسالة من {contact.name}</h2>
					<div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
						<span dir="ltr">{contact.email}</span>
						<span>·</span>
						<span>{safeFormat(contact.submitted_at ?? contact.created_at, "dd/MM/yyyy HH:mm")}</span>
						<span className="mr-2">
							<Badge variant={STATUS_VARIANT[contact.status]} dot>
								{STATUS_LABEL[contact.status]}
							</Badge>
						</span>
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{contact.status !== "RESPONDED" && (
						<button onClick={() => onStatus("RESPONDED")} className="cursor-pointer p-2 rounded-md transition-colors text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success-soft))]" title="تحديد كَ تم الرد" aria-label="تحديد كَ تم الرد"><Archive className="h-4 w-4" strokeWidth={1.6} /></button>
					)}
					{contact.status !== "SPAM" && (
						<button onClick={() => onStatus("SPAM")} className="cursor-pointer p-2 rounded-md transition-colors text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-soft))]" title="تحديد كَ مزعجة" aria-label="تحديد كَ مزعجة"><ShieldAlert className="h-4 w-4" strokeWidth={1.6} /></button>
					)}
					<button onClick={onDelete} className="cursor-pointer p-2 rounded-md transition-colors text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-soft))]" title="حذف" aria-label="حذف"><Trash2 className="h-4 w-4" strokeWidth={1.6} /></button>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-6">
				<div className="max-w-3xl">
					<div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap leading-7">
						{contact.message}
					</div>

					{!showReply ? (
						<div className="mt-8 flex gap-2">
							<button onClick={() => setShowReply(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90">
								<Reply className="h-4 w-4" />الرد
							</button>
							<a
								href={buildWebmailComposeUrl({
									to: contact.email,
									subject: "رد: رسالتك إلى موقع الإمام زين العابدين",
								})}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 text-gray-700"
							>
								<Mail className="h-4 w-4" />فتح في بريد Hostinger
							</a>
						</div>
					) : (
						<div className="mt-8 border border-gray-200 rounded-xl overflow-hidden">
							<div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-600 flex items-center justify-between">
								<span>إلى: <span className="font-medium" dir="ltr">{contact.email}</span></span>
								<span className="text-amber-600">⚠ سيُفتح بريد Hostinger لإتمام الإرسال الفعلي</span>
							</div>
							<RichTextEditor
								value={reply}
								onChange={setReply}
								placeholder={`السلام عليكم ${contact.name}،\n\nشكراً لتواصلك معنا...`}
								minHeight={220}
								maxBytes={32 * 1024}
							/>
							<div className="flex justify-end gap-2 px-4 py-3 bg-gray-50/60 border-t border-gray-100">
								<button onClick={() => { setShowReply(false); setReply("") }} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-white text-gray-700">إلغاء</button>
								<button
									onClick={sendReply}
									disabled={!reply.trim() || reply.trim() === "<p></p>"}
									className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-primary/90 disabled:opacity-50"
								>
									<Send className="h-4 w-4" />إرسال وتحديد كَ &quot;تم الرد&quot;
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</>
	)
}
