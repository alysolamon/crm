<template>
  <!-- Note content can originate from users or agents. It is always sanitized
       after Markdown conversion and before display. -->
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div
    class="note-content prose prose-sm max-w-none text-ink-gray-8"
    :class="compact ? 'pointer-events-none overflow-hidden' : ''"
    v-html="renderedContent"
    @click="openRenderedLink"
  />
</template>

<script setup>
import { renderNoteContent } from '@/utils/noteContent'
import { computed } from 'vue'

const props = defineProps({
  content: { type: String, default: '' },
  compact: { type: Boolean, default: false },
})

const renderedContent = computed(() => renderNoteContent(props.content))

function openRenderedLink(event) {
  if (props.compact) return

  const link = event.target.closest?.('a')
  if (!link?.href) return

  event.preventDefault()
  window.open(link.href, '_blank', 'noopener,noreferrer')
}
</script>

<style scoped>
.note-content :deep(h1),
.note-content :deep(h2),
.note-content :deep(h3) {
  scroll-margin-top: 1rem;
}

.note-content :deep(a) {
  overflow-wrap: anywhere;
}
</style>
