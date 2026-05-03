<script setup lang="ts">
const props = defineProps<{
  publicId?: string | null
  size?: number
  rounded?: 'full' | 'md' | 'lg'
  editable?: boolean
}>()

const emit = defineEmits<{ edit: [] }>()

const { avatar } = useCloudinary()
const photoUrl = computed(() => avatar(props.publicId, (props.size ?? 48) * 2))
const radiusClass = computed(() => {
  if (props.rounded === 'full') return 'rounded-full'
  if (props.rounded === 'lg') return 'rounded-[14px]'
  return 'rounded-[10px]'
})
</script>

<template>
  <button
    type="button"
    class="relative shrink-0 bg-primary-500/10 text-primary-500 inline-flex items-center justify-center overflow-hidden group"
    :class="[radiusClass, editable ? 'cursor-pointer' : 'cursor-default']"
    :style="{ width: (size ?? 48) + 'px', height: (size ?? 48) + 'px' }"
    :disabled="!editable"
    @click="editable && emit('edit')"
  >
    <img
      v-if="photoUrl"
      :src="photoUrl"
      alt=""
      class="w-full h-full object-cover"
      loading="lazy"
    >
    <UIcon
      v-else
      name="i-lucide-sailboat"
      class="size-1/2"
    />
    <span
      v-if="editable"
      class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
    >
      <UIcon
        name="i-lucide-camera"
        class="size-5 text-white"
      />
    </span>
  </button>
</template>
