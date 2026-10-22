"use client"

import AudioForm from "@/components/audios/AudioForm"
import { useAudio } from "@/lib/queries/audios"
import EditRoute, { EditRouteSpinner } from "@/components/layout/EditRoute"

export default function EditAudioPage() {
	return <EditRoute>{(id) => <EditAudio id={id} />}</EditRoute>
}

function EditAudio({ id }: { id: string }) {
	const { data: audio, isLoading } = useAudio(id)
	if (isLoading) return <EditRouteSpinner />
	if (!audio) return <p className="text-gray-500">لم يتم العثور على التسجيل.</p>
	return <div><h1 className="text-3xl font-bold text-gray-900 mb-6">تعديل التسجيل</h1><AudioForm audio={audio} /></div>
}
