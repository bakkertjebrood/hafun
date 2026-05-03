<script setup lang="ts">
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

const props = defineProps<{
  boatId: string
  currentPublicId?: string | null
}>()

const emit = defineEmits<{
  close: []
  saved: [publicId: string]
  removed: []
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const cropper = ref<InstanceType<typeof Cropper> | null>(null)
const sourceUrl = ref<string | null>(null)
const flipH = ref(false)
const flipV = ref(false)
const rotation = ref(0)
const busy = ref(false)
const error = ref<string | null>(null)

function pickFile() {
  fileInput.value?.click()
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  if (file.size > 25 * 1024 * 1024) {
    error.value = 'Foto is groter dan 25MB. Kies een kleinere foto.'
    return
  }
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value)
  sourceUrl.value = URL.createObjectURL(file)
  flipH.value = false
  flipV.value = false
  rotation.value = 0
  error.value = null
}

function rotate(deg: number) {
  rotation.value = (rotation.value + deg + 360) % 360
}

function flipHorizontal() {
  flipH.value = !flipH.value
}

function flipVertical() {
  flipV.value = !flipV.value
}

function reset() {
  flipH.value = false
  flipV.value = false
  rotation.value = 0
}

/**
 * Cropper geeft een canvas terug met de uitsnede + transformaties toegepast.
 * We comprimeren naar JPEG q=0.85 en max 1600px langste zijde voor avatar +
 * detail-views; ruim genoeg en kleiner dan 500KB voor typische foto's.
 */
function compressedBlob(canvas: HTMLCanvasElement, maxDim = 1600, quality = 0.85): Promise<Blob> {
  let { width, height } = canvas
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height)
    const out = document.createElement('canvas')
    out.width = Math.round(width * scale)
    out.height = Math.round(height * scale)
    out.getContext('2d')!.drawImage(canvas, 0, 0, out.width, out.height)
    canvas = out
    width = out.width
    height = out.height
  }
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Compressie mislukt')),
      'image/jpeg',
      quality
    )
  })
}

async function uploadToCloudinary(blob: Blob): Promise<string> {
  const params = await $fetch<{
    cloudName: string
    apiKey: string
    timestamp: number
    signature: string
    folder: string
    publicId: string
  }>(`/api/boats/${props.boatId}/photo/sign`, { method: 'POST' })

  const form = new FormData()
  form.append('file', blob, 'boat.jpg')
  form.append('api_key', params.apiKey)
  form.append('timestamp', String(params.timestamp))
  form.append('signature', params.signature)
  form.append('folder', params.folder)
  form.append('public_id', params.publicId)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${params.cloudName}/image/upload`, {
    method: 'POST',
    body: form
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Cloudinary upload mislukt (${res.status}): ${text.slice(0, 200)}`)
  }
  const data = await res.json() as { public_id?: string }
  if (!data.public_id) throw new Error('Cloudinary gaf geen public_id terug')
  return data.public_id
}

async function save() {
  if (!cropper.value) return
  busy.value = true
  error.value = null
  try {
    const result = (cropper.value as any).getResult() as { canvas?: HTMLCanvasElement }
    if (!result?.canvas) throw new Error('Crop niet beschikbaar')

    const blob = await compressedBlob(result.canvas)
    const publicId = await uploadToCloudinary(blob)

    await $fetch(`/api/boats/${props.boatId}/photo`, {
      method: 'PUT',
      body: { publicId }
    })

    emit('saved', publicId)
  } catch (e: any) {
    error.value = e?.message || 'Opslaan mislukt'
  } finally {
    busy.value = false
  }
}

async function removePhoto() {
  if (!props.currentPublicId) {
    emit('close')
    return
  }
  busy.value = true
  error.value = null
  try {
    await $fetch(`/api/boats/${props.boatId}/photo`, { method: 'DELETE' })
    emit('removed')
  } catch (e: any) {
    error.value = e?.message || 'Verwijderen mislukt'
  } finally {
    busy.value = false
  }
}

onUnmounted(() => {
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value)
})
</script>

<template>
  <div class="fixed inset-0 z-[2000] flex items-center justify-center p-3">
    <div
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
      @click="emit('close')"
    />

    <div class="relative bg-white rounded-[20px] shadow-2xl w-full max-w-md flex flex-col overflow-hidden max-h-[95vh]">
      <div class="px-5 pt-4 pb-3 flex items-center justify-between border-b border-black/[0.08]">
        <h2 class="text-base font-semibold text-[#0A1520]">Bootfoto</h2>
        <button
          class="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center"
          @click="emit('close')"
        >
          <UIcon
            name="i-lucide-x"
            class="size-4 text-[#5A6A78]"
          />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto">
        <!-- Bestaande foto / placeholder als nog geen bron geladen -->
        <div
          v-if="!sourceUrl"
          class="px-5 py-8 flex flex-col items-center gap-4"
        >
          <div class="w-32 h-32 rounded-[14px] bg-[#F4F7F8] flex items-center justify-center overflow-hidden">
            <BoatBoatAvatar
              v-if="currentPublicId"
              :public-id="currentPublicId"
              :size="128"
              rounded="lg"
            />
            <UIcon
              v-else
              name="i-lucide-camera"
              class="size-12 text-[#5A6A78]/50"
            />
          </div>
          <button
            class="px-5 py-2.5 rounded-full bg-primary-500 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-primary-600"
            @click="pickFile"
          >
            <UIcon
              name="i-lucide-upload"
              class="size-4"
            />
            {{ currentPublicId ? 'Vervang foto' : 'Kies foto' }}
          </button>
          <button
            v-if="currentPublicId"
            class="text-[12px] text-red-500 hover:text-red-600"
            :disabled="busy"
            @click="removePhoto"
          >
            Verwijder huidige foto
          </button>
        </div>

        <!-- Crop area -->
        <div
          v-else
          class="relative bg-black"
          style="height: min(60vh, 480px);"
        >
          <Cropper
            ref="cropper"
            :src="sourceUrl"
            :stencil-props="{ aspectRatio: 4 / 3 }"
            :transformations="{
              flip: { horizontal: flipH, vertical: flipV },
              rotate: rotation
            }"
            class="cropper"
          />
        </div>
      </div>

      <!-- Toolbar -->
      <div
        v-if="sourceUrl"
        class="px-5 py-3 border-t border-black/[0.08] grid grid-cols-4 gap-2"
      >
        <button
          class="py-2 rounded-[10px] bg-[#F4F7F8] text-[#0A1520] text-xs font-semibold inline-flex flex-col items-center gap-0.5 hover:bg-black/5"
          title="Roteer 90° tegen de klok in"
          @click="rotate(-90)"
        >
          <UIcon
            name="i-lucide-rotate-ccw"
            class="size-4"
          />
          90°
        </button>
        <button
          class="py-2 rounded-[10px] bg-[#F4F7F8] text-[#0A1520] text-xs font-semibold inline-flex flex-col items-center gap-0.5 hover:bg-black/5"
          title="Roteer 90° met de klok mee"
          @click="rotate(90)"
        >
          <UIcon
            name="i-lucide-rotate-cw"
            class="size-4"
          />
          90°
        </button>
        <button
          class="py-2 rounded-[10px] text-xs font-semibold inline-flex flex-col items-center gap-0.5"
          :class="flipH ? 'bg-primary-500 text-white' : 'bg-[#F4F7F8] text-[#0A1520] hover:bg-black/5'"
          title="Horizontaal spiegelen"
          @click="flipHorizontal"
        >
          <UIcon
            name="i-lucide-flip-horizontal-2"
            class="size-4"
          />
          Spiegel
        </button>
        <button
          class="py-2 rounded-[10px] text-xs font-semibold inline-flex flex-col items-center gap-0.5"
          :class="flipV ? 'bg-primary-500 text-white' : 'bg-[#F4F7F8] text-[#0A1520] hover:bg-black/5'"
          title="Verticaal spiegelen"
          @click="flipVertical"
        >
          <UIcon
            name="i-lucide-flip-vertical-2"
            class="size-4"
          />
          Spiegel
        </button>
      </div>

      <div
        v-if="error"
        class="px-5 py-2 bg-red-50 border-t border-red-200 text-[12px] text-red-700"
      >
        {{ error }}
      </div>

      <div
        v-if="sourceUrl"
        class="px-5 py-3 border-t border-black/[0.08] flex gap-2"
        style="padding-bottom: max(env(safe-area-inset-bottom), 12px);"
      >
        <button
          class="px-4 py-2.5 rounded-full bg-[#F4F7F8] text-[#5A6A78] text-sm font-semibold hover:bg-black/5"
          :disabled="busy"
          @click="reset"
        >
          Reset
        </button>
        <button
          class="px-4 py-2.5 rounded-full bg-[#F4F7F8] text-[#5A6A78] text-sm font-semibold hover:bg-black/5"
          :disabled="busy"
          @click="pickFile"
        >
          Andere foto
        </button>
        <button
          class="flex-1 py-2.5 rounded-full bg-primary-500 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
          :disabled="busy"
          @click="save"
        >
          <UIcon
            v-if="busy"
            name="i-lucide-loader-2"
            class="size-4 animate-spin"
          />
          {{ busy ? 'Bezig…' : 'Opslaan' }}
        </button>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        capture="environment"
        class="hidden"
        @change="onFileChange"
      >
    </div>
  </div>
</template>

<style scoped>
.cropper {
  height: 100%;
  background: #000;
}
</style>
