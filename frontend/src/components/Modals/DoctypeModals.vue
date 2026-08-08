<template>
  <component
    v-if="doctypeModal.show.value"
    :is="activeModal"
    v-model="doctypeModal.show.value"
    :doctypeTitle="doctypeModal.title.value"
    :doctype="doctypeModal.doctype.value"
    :docname="doctypeModal.name.value"
    :defaults="doctypeModal.defaults.value"
    @afterInsert="(d) => doctypeModal.triggerCallback('afterInsert', d)"
    @afterUpdate="(d) => doctypeModal.triggerCallback('afterUpdate', d)"
  />
</template>
<script setup>
import DoctypeModal from '@/components/Modals/DoctypeModal.vue'
import NoteModal from '@/components/Modals/NoteModal.vue'
import { useDoctypeModal } from '@/composables/doctypeModal'
import { computed } from 'vue'

const doctypeModal = useDoctypeModal()
const activeModal = computed(() =>
  doctypeModal.doctype.value === 'FCRM Note' ? NoteModal : DoctypeModal,
)
</script>
