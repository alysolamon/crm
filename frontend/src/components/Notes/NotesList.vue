<template>
  <div class="grid w-full grid-cols-1 gap-3 overflow-y-auto p-5 xl:grid-cols-2">
    <button
      v-for="note in notes"
      :key="note.name"
      type="button"
      class="flex min-h-52 flex-col rounded-lg border bg-surface-base p-4 text-left shadow-sm transition hover:bg-surface-gray-1"
      @click="openNote(note.name)"
    >
      <div class="mb-2 flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1 truncate text-lg-medium text-ink-gray-9">
          {{ note.title }}
        </div>
        <Badge
          v-if="note.custom_alfint_review_status"
          :label="note.custom_alfint_review_status"
          :theme="statusTheme(note.custom_alfint_review_status)"
        />
      </div>
      <NoteContent
        v-if="note.content"
        :content="note.content"
        compact
        class="flex-1 text-p-sm text-ink-gray-6"
      />
      <div class="mt-3 flex items-center justify-between gap-3 border-t pt-3">
        <div class="flex min-w-0 items-center gap-2">
          <Badge
            v-if="note.custom_alfint_note_type"
            :label="note.custom_alfint_note_type"
            variant="outline"
          />
          <span class="truncate text-sm text-ink-gray-5">
            {{ referenceLabel(note.reference_doctype) }}
          </span>
        </div>
        <Tooltip :text="formatDate(note.modified)">
          <span class="shrink-0 text-sm text-ink-gray-6">
            {{ __(timeAgo(note.modified)) }}
          </span>
        </Tooltip>
      </div>
    </button>
  </div>
</template>

<script setup>
import NoteContent from '@/components/Notes/NoteContent.vue'
import { useDoctypeModal } from '@/composables/doctypeModal'
import { formatDate, timeAgo } from '@/utils'
import { Badge, Tooltip } from 'frappe-ui'

defineProps({
  notes: { type: Array, default: () => [] },
})

const emit = defineEmits(['reload'])
const { showModal } = useDoctypeModal()

function openNote(name) {
  showModal({
    name,
    doctype: 'FCRM Note',
    title: 'Note',
    callbacks: {
      afterUpdate: () => emit('reload'),
    },
  })
}

function statusTheme(status) {
  return { Proposed: 'amber', Reviewed: 'blue', Confirmed: 'green' }[status]
}

function referenceLabel(doctype) {
  return (
    {
      'CRM Lead': __('Lead note'),
      'CRM Deal': __('Deal note'),
      'CRM Organization': __('Organization note'),
      Contact: __('Contact note'),
    }[doctype] || __('Linked note')
  )
}
</script>
