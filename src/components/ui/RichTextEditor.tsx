"use client"

import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Underline from "@tiptap/extension-underline"
import Placeholder from "@tiptap/extension-placeholder"
import {
	Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Quote, Code,
	Heading1, Heading2, Heading3, Link as LinkIcon, Image as ImageIcon,
	AlignRight, AlignCenter, AlignLeft, Undo, Redo, Minus, AlertTriangle,
} from "lucide-react"
import { useEffect, useMemo } from "react"
import { byteLength, isSafeUrl, isSafeImageUrl, sanitizeEditorHtml } from "@/lib/sanitize"

type Props = {
	value: string
	onChange: (html: string) => void
	placeholder?: string
	dir?: "rtl" | "ltr"
	onPickImage?: () => Promise<string | null>
	minHeight?: number
	/** Hard byte ceiling. Defaults to 200 KB to match the API limit. Pass 0 to disable. */
	maxBytes?: number
}

export default function RichTextEditor({
	value,
	onChange,
	placeholder = "ابدأ الكتابة...",
	dir = "rtl",
	onPickImage,
	minHeight = 240,
	maxBytes = 200 * 1024,
}: Props) {
	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit,
			Underline,
			TextAlign.configure({ types: ["heading", "paragraph"] }),
			// XSS hardening: only http/https/mailto/tel are allowed in href attributes.
			// Tiptap's `validate` runs on user-typed and pasted URLs.
			Link.configure({
				openOnClick: false,
				autolink: true,
				protocols: ["http", "https", "mailto", "tel"],
				HTMLAttributes: { class: "text-primary underline", rel: "noopener noreferrer", target: "_blank" },
				validate: (href) => isSafeUrl(href),
			}),
			Image.configure({
				HTMLAttributes: { class: "max-w-full rounded-md my-2" },
				allowBase64: true,
			}),
			Placeholder.configure({ placeholder }),
		],
		content: value || "",
		editorProps: {
			attributes: {
				class: "tiptap prose prose-sm max-w-none focus:outline-none px-4 py-3",
				dir,
				style: `min-height: ${minHeight}px`,
			},
			// Reject pasted images with a javascript:/data:non-image src as a second line of defense
			handlePaste(view, event) {
				const html = event.clipboardData?.getData("text/html")
				if (html && /(javascript|vbscript):/i.test(html)) {
					event.preventDefault()
					const sanitized = sanitizeEditorHtml(html)
					view.pasteHTML(sanitized)
					return true
				}
				return false
			},
		},
		onUpdate: ({ editor }) => onChange(editor.getHTML()),
	})

	useEffect(() => {
		if (editor && value !== editor.getHTML()) {
			editor.commands.setContent(value || "", { emitUpdate: false })
		}
	}, [editor, value])

	const bytes = useMemo(() => byteLength(value || ""), [value])
	const overLimit = maxBytes > 0 && bytes > maxBytes
	const nearLimit = maxBytes > 0 && bytes > maxBytes * 0.9 && !overLimit

	if (!editor) {
		return (
			<div
				className="border border-gray-300 rounded-md bg-gray-50 animate-pulse"
				style={{ minHeight: minHeight + 48 }}
			/>
		)
	}

	const insertLink = () => {
		const previousUrl = editor.getAttributes("link").href as string | undefined
		const url = window.prompt("الرابط (اتركه فارغاً للإزالة):", previousUrl ?? "https://")
		if (url === null) return
		if (url === "") {
			editor.chain().focus().extendMarkRange("link").unsetLink().run()
			return
		}
		if (!isSafeUrl(url)) {
			alert("الرابط غير مسموح. يُسمح فقط بـ http, https, mailto, tel، أو روابط داخلية.")
			return
		}
		editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
	}

	const insertImage = async () => {
		if (onPickImage) {
			const url = await onPickImage()
			if (url && isSafeImageUrl(url)) editor.chain().focus().setImage({ src: url }).run()
			return
		}
		const url = window.prompt("رابط الصورة:")
		if (!url) return
		if (!isSafeImageUrl(url)) {
			alert("رابط الصورة غير صالح. يجب أن يبدأ بـ https:// أو يكون من نوع data:image/.")
			return
		}
		editor.chain().focus().setImage({ src: url }).run()
	}

	return (
		<div className={`border rounded-md bg-white focus-within:ring-2 focus-within:ring-primary/30 ${overLimit ? "border-red-400 ring-1 ring-red-200" : "border-gray-300 focus-within:border-primary"}`}>
			<Toolbar
				editor={editor}
				onLink={insertLink}
				onImage={insertImage}
			/>
			<EditorContent editor={editor} />
			<EditorFooter bytes={bytes} maxBytes={maxBytes} overLimit={overLimit} nearLimit={nearLimit} />
			<style>{`
				.tiptap p.is-editor-empty:first-child::before {
					content: attr(data-placeholder);
					color: #9ca3af;
					float: ${dir === "rtl" ? "right" : "left"};
					height: 0;
					pointer-events: none;
				}
				.tiptap h1 { font-size: 1.5rem; font-weight: 700; margin: 1rem 0 0.5rem; }
				.tiptap h2 { font-size: 1.25rem; font-weight: 700; margin: 1rem 0 0.5rem; }
				.tiptap h3 { font-size: 1.125rem; font-weight: 600; margin: 0.75rem 0 0.5rem; }
				.tiptap ul { list-style: disc; padding-${dir === "rtl" ? "right" : "left"}: 1.5rem; margin: 0.5rem 0; }
				.tiptap ol { list-style: decimal; padding-${dir === "rtl" ? "right" : "left"}: 1.5rem; margin: 0.5rem 0; }
				.tiptap blockquote { border-${dir === "rtl" ? "right" : "left"}: 4px solid #006654; padding-${dir === "rtl" ? "right" : "left"}: 1rem; margin: 0.75rem 0; color: #4b5563; font-style: italic; }
				.tiptap code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 0.9em; }
				.tiptap pre { background: #111827; color: #f9fafb; padding: 0.75rem 1rem; border-radius: 6px; margin: 0.75rem 0; overflow-x: auto; }
				.tiptap hr { border: none; border-top: 2px solid #e5e7eb; margin: 1rem 0; }
				.tiptap img { display: block; margin: 0.75rem 0; }
			`}</style>
		</div>
	)
}

function EditorFooter({
	bytes, maxBytes, overLimit, nearLimit,
}: {
	bytes: number
	maxBytes: number
	overLimit: boolean
	nearLimit: boolean
}) {
	if (maxBytes <= 0) return null
	const fmt = (n: number) =>
		n < 1024 ? `${n} بايت` : `${(n / 1024).toFixed(1)} ك.ب`
	const pct = Math.min(100, (bytes / maxBytes) * 100)
	return (
		<div className="border-t border-gray-100 px-3 py-1.5 flex items-center gap-3 text-[11px] bg-gray-50/40">
			<div className="flex-1 h-1.5 bg-gray-200 rounded overflow-hidden">
				<div
					className={`h-full transition-all ${overLimit ? "bg-red-500" : nearLimit ? "bg-amber-500" : "bg-primary"}`}
					style={{ width: `${pct}%` }}
				/>
			</div>
			<span className={overLimit ? "text-red-600 font-semibold" : nearLimit ? "text-amber-700" : "text-gray-500"}>
				{overLimit && <AlertTriangle className="inline h-3 w-3 ml-1" />}
				{fmt(bytes)} / {fmt(maxBytes)}
				{overLimit && " — تجاوز الحد المسموح"}
			</span>
		</div>
	)
}

function Toolbar({
	editor,
	onLink,
	onImage,
}: {
	editor: Editor
	onLink: () => void
	onImage: () => void
}) {
	const Btn = ({
		onClick, active, disabled, title, children,
	}: {
		onClick: () => void
		active?: boolean
		disabled?: boolean
		title: string
		children: React.ReactNode
	}) => (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title={title}
			className={`p-1.5 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-40 ${active ? "bg-primary/10 text-primary" : ""}`}
		>
			{children}
		</button>
	)

	const Sep = () => <div className="w-px h-5 bg-gray-200 mx-1" />

	return (
		<div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50/60 rounded-t-md">
			<Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="عنوان كبير"><Heading1 className="h-4 w-4" /></Btn>
			<Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="عنوان متوسط"><Heading2 className="h-4 w-4" /></Btn>
			<Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="عنوان صغير"><Heading3 className="h-4 w-4" /></Btn>
			<Sep />
			<Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="غامق"><Bold className="h-4 w-4" /></Btn>
			<Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="مائل"><Italic className="h-4 w-4" /></Btn>
			<Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="مسطّر"><UnderlineIcon className="h-4 w-4" /></Btn>
			<Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="كود مضمّن"><Code className="h-4 w-4" /></Btn>
			<Sep />
			<Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="قائمة نقطية"><List className="h-4 w-4" /></Btn>
			<Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="قائمة مرقّمة"><ListOrdered className="h-4 w-4" /></Btn>
			<Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="اقتباس"><Quote className="h-4 w-4" /></Btn>
			<Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="خط فاصل"><Minus className="h-4 w-4" /></Btn>
			<Sep />
			<Btn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="محاذاة لليمين"><AlignRight className="h-4 w-4" /></Btn>
			<Btn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="توسيط"><AlignCenter className="h-4 w-4" /></Btn>
			<Btn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="محاذاة لليسار"><AlignLeft className="h-4 w-4" /></Btn>
			<Sep />
			<Btn onClick={onLink} active={editor.isActive("link")} title="رابط"><LinkIcon className="h-4 w-4" /></Btn>
			<Btn onClick={onImage} title="صورة"><ImageIcon className="h-4 w-4" /></Btn>
			<Sep />
			<Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="تراجع"><Undo className="h-4 w-4" /></Btn>
			<Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="إعادة"><Redo className="h-4 w-4" /></Btn>
		</div>
	)
}
