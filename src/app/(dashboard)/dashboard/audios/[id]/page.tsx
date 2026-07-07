"use client"
import { use } from "react"
import AudioForm from "@/components/audios/AudioForm"
import { useAudio } from "@/lib/queries/audios"
import { Loader2 } from "lucide-react"

export default function EditAudioPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const { data: audio, isLoading } = useAudio(id)
	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
	if (!audio) return <p className="text-gray-500">لم يتم العثور على التسجيل.</p>
	return <div><h1 className="text-3xl font-bold text-gray-900 mb-6">تعديل التسجيل</h1><AudioForm audio={audio} /></div>
}
