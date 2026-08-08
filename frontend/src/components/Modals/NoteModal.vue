<template>
  <Dialog v-model:open="show" size="4xl" bare>
    <div class="bg-surface-elevation-2 px-4 pb-6 pt-5 sm:px-6">
      <div class="mb-5 flex items-start justify-between gap-3">
        <h3
          class="min-w-0 flex-1 truncate text-3xl-semibold leading-8 text-ink-gray-9"
          :title="dialogTitle"
        >
          {{ dialogTitle }}
        </h3>
        <div class="flex shrink-0 items-center gap-1">
          <CustomActions
            v-if="noteActions.length"
            :actions="noteActions"
            :close="() => (show = false)"
          />
          <Button
            v-if="readMode"
            :label="__('Edit')"
            :icon-left="EditIcon"
            @click="startEditing"
          />
          <Button
            v-if="editing && isManager() && !isMobileView"
            variant="ghost"
            class="w-7"
            :tooltip="__('Edit Fields Layout')"
            :icon="EditIcon"
            @click="openQuickEntryModal"
          />
          <Button
            variant="ghost"
            class="w-7"
            icon="lucide-x"
            :tooltip="__('Close')"
            @click="show = false"
          />
        </div>
      </div>

      <div
        v-if="props.docname && !document.doc?.name"
        class="flex min-h-72 items-center justify-center"
      >
        <LoadingIndicator class="h-6 w-6" />
      </div>

      <template v-else-if="readMode">
        <button
          v-if="referenceIdentity"
          type="button"
          class="mb-4 flex w-full items-center gap-3 rounded-lg border bg-surface-base px-3 py-2.5 text-left transition hover:bg-surface-gray-2"
          @click="openReference"
        >
          <Avatar
            :label="referenceIdentity.label"
            :image="referenceIdentity.image"
            size="md"
          />
          <div class="min-w-0 flex-1">
            <div class="text-sm text-ink-gray-5">{{ __('Linked to') }}</div>
            <div class="truncate text-base-medium text-ink-gray-9">
              {{ referenceIdentity.label }}
            </div>
          </div>
          <Badge :label="referenceLabel" variant="outline" />
          <span class="lucide-arrow-up-right size-4 text-ink-gray-5" />
        </button>
        <div class="mb-5 flex flex-wrap items-center gap-2 border-b pb-4">
          <Badge
            v-if="doc.custom_alfint_note_type"
            :label="doc.custom_alfint_note_type"
            variant="outline"
          />
          <Badge
            v-if="doc.custom_alfint_review_status"
            :label="doc.custom_alfint_review_status"
            :theme="reviewStatusTheme"
          />
          <Badge
            v-if="doc.custom_alfint_evidence"
            :label="__('Evidence linked')"
            theme="blue"
            variant="outline"
          />
          <Button
            v-if="doc.custom_alfint_source_url"
            :label="__('Open source')"
            icon-left="external-link"
            variant="ghost"
            @click="openSource"
          />
        </div>
        <div class="max-h-[65vh] min-h-72 overflow-y-auto pr-2 sm:min-h-96">
          <NoteContent
            v-if="doc.content"
            :content="doc.content"
            class="mx-auto max-w-3xl pb-8 text-base leading-7"
          />
          <div
            v-else
            class="flex min-h-72 items-center justify-center text-base text-ink-gray-5"
          >
            {{ __('This note has no content.') }}
          </div>
        </div>
      </template>

      <template v-else>
        <FieldLayout
          v-if="editLayout.length"
          :tabs="editLayout"
          :data="doc"
          :doctype="doctype"
          :docname="docname"
        />
        <ErrorMessage v-if="error" class="mt-4" :message="__(error)" />
      </template>
    </div>

    <div v-if="editing" class="px-4 pb-7 pt-4 sm:px-6">
      <div class="flex justify-end gap-2">
        <Button :label="__('Cancel')" @click="cancelEditing" />
        <Button
          variant="solid"
          :label="isExisting ? __('Update') : __('Create')"
          :loading="isExisting ? document.save.loading : create.loading"
          :disabled="!canSave"
          @click="isExisting ? update() : insert()"
        />
      </div>
    </div>
  </Dialog>
</template>

<script setup>
import CustomActions from '@/components/CustomActions.vue'
import EditIcon from '@/components/Icons/EditIcon.vue'
import FieldLayout from '@/components/FieldLayout/FieldLayout.vue'
import NoteContent from '@/components/Notes/NoteContent.vue'
import { useDocument } from '@/data/document'
import { globalStore } from '@/stores/global'
import { usersStore } from '@/stores/users'
import { showQuickEntryModal, quickEntryProps } from '@/composables/modals'
import { isMobileView } from '@/composables/settings'
import { deepClone, setupCustomizations } from '@/utils'
import {
  Badge,
  Avatar,
  call,
  createResource,
  ErrorMessage,
  LoadingIndicator,
  toast,
} from 'frappe-ui'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  doctypeTitle: { type: String, default: '' },
  doctype: { type: String, default: '' },
  docname: { type: String, default: '' },
  defaults: { type: Object, default: () => ({}) },
})

const show = defineModel({ type: Boolean })
const emit = defineEmits(['afterInsert', 'afterUpdate'])

const router = useRouter()
const { isManager } = usersStore()
const { $dialog, $socket } = globalStore()
const { document, scripts, triggerOnRender, triggerOnBeforeCreate } =
  useDocument(props.doctype, props.docname || null)

const doc = computed(() => document.doc || {})
const isExisting = computed(() => Boolean(props.docname))
const mode = ref(props.docname ? 'read' : 'edit')
const readMode = computed(() => isExisting.value && mode.value === 'read')
const editing = computed(() => !readMode.value)
const error = ref(null)
const editSnapshot = ref(null)
const referenceIdentity = ref(null)

const referenceTypeOptions = [
  { label: __('Lead'), value: 'CRM Lead' },
  { label: __('Deal'), value: 'CRM Deal' },
  { label: __('Organization'), value: 'CRM Organization' },
  { label: __('Contact'), value: 'Contact' },
]

const showReferencePicker = computed(
  () =>
    editing.value &&
    (!isExisting.value ||
      !doc.value.reference_doctype ||
      !doc.value.reference_docname),
)
const canSave = computed(() =>
  Boolean(doc.value.reference_doctype && doc.value.reference_docname),
)
const referenceLabel = computed(
  () =>
    referenceTypeOptions.find(
      (option) => option.value === referenceIdentity.value?.doctype,
    )?.label || referenceIdentity.value?.doctype,
)
const noteActions = computed(() =>
  (document.actions || []).filter(
    (action) => !/^Open (Lead|Deal|Organization|Contact)$/.test(action.label),
  ),
)

const dialogTitle = computed(() => {
  if (readMode.value) return doc.value.title || __('Note')
  return isExisting.value
    ? __('Edit ' + (props.doctypeTitle || props.doctype))
    : __('Create ' + (props.doctypeTitle || props.doctype))
})

const reviewStatusTheme = computed(() => {
  return (
    {
      Proposed: 'amber',
      Reviewed: 'blue',
      Confirmed: 'green',
    }[doc.value.custom_alfint_review_status] || 'gray'
  )
})

const layout = createResource({
  url: 'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_fields_layout',
  cache: ['Quick Entry', props.doctype],
  params: { doctype: props.doctype, type: 'Quick Entry' },
  auto: true,
})

const editLayout = computed(() => {
  const tabs = deepClone(layout.data || [])
  if (!showReferencePicker.value || !tabs.length) return tabs

  tabs[0].sections.unshift({
    name: 'alfint_note_reference_section',
    label: __('Linked record'),
    opened: true,
    collapsible: false,
    columns: [
      {
        name: 'alfint_note_reference_type_column',
        fields: [
          {
            fieldname: 'reference_doctype',
            fieldtype: 'Select',
            label: __('Record type'),
            options: referenceTypeOptions,
            placeholder: __('Select record type'),
            reqd: true,
          },
        ],
      },
      {
        name: 'alfint_note_reference_record_column',
        fields: [
          {
            fieldname: 'reference_docname',
            fieldtype: 'Dynamic Link',
            label: __('Record'),
            options: 'reference_doctype',
            placeholder: doc.value.reference_doctype
              ? __('Select record')
              : __('Select record type first'),
            reqd: true,
          },
        ],
      },
    ],
  })
  return tabs
})

const create = createResource({
  url: 'frappe.client.insert',
  onSuccess: (createdDoc) => {
    document.doc = {}
    emit('afterInsert', createdDoc)
    show.value = false
  },
  onError: setError,
})

async function insert() {
  await triggerOnBeforeCreate?.()
  create.submit({
    doc: {
      doctype: props.doctype,
      ...document.doc,
    },
  })
}

function update() {
  document.save.submit(null, {
    onSuccess: (updatedDoc) => {
      error.value = null
      editSnapshot.value = null
      mode.value = 'read'
      emit('afterUpdate', updatedDoc)
    },
    onError: setError,
  })
}

function setError(err) {
  if (err.exc_type === 'MandatoryError') {
    const fieldNames = (err.messages || [])
      .map((message) => message.split(': ').at(-1)?.trim())
      .filter(Boolean)
      .join(', ')
    error.value = __('Mandatory field error: {0}', [fieldNames])
    return
  }
  error.value = err.messages?.[0] || __('Could not save note')
}

function startEditing() {
  editSnapshot.value = deepClone(document.doc)
  error.value = null
  mode.value = 'edit'
}

function cancelEditing() {
  error.value = null
  if (!isExisting.value) {
    show.value = false
    return
  }

  if (editSnapshot.value) {
    Object.keys(document.doc).forEach((key) => delete document.doc[key])
    Object.assign(document.doc, deepClone(editSnapshot.value))
  }
  editSnapshot.value = null
  mode.value = 'read'
}

function openSource() {
  window.open(
    doc.value.custom_alfint_source_url,
    '_blank',
    'noopener,noreferrer',
  )
}

async function loadReferenceIdentity() {
  referenceIdentity.value = null
  if (!doc.value.reference_doctype || !doc.value.reference_docname) return
  try {
    referenceIdentity.value = await call(
      'alfint_relationships.api.sales.get_note_reference_identity',
      {
        reference_doctype: doc.value.reference_doctype,
        reference_name: doc.value.reference_docname,
      },
    )
  } catch {
    referenceIdentity.value = null
  }
}

function openReference() {
  if (!referenceIdentity.value) return
  const routeByDoctype = {
    'CRM Lead': { name: 'Lead', param: 'leadId' },
    'CRM Deal': { name: 'Deal', param: 'dealId' },
    'CRM Organization': { name: 'Organization', param: 'organizationId' },
    Contact: { name: 'Contact', param: 'contactId' },
  }
  const target = routeByDoctype[referenceIdentity.value.doctype]
  if (!target) return
  show.value = false
  router.push({
    name: target.name,
    params: { [target.param]: referenceIdentity.value.name },
  })
}

function openQuickEntryModal() {
  showQuickEntryModal.value = true
  quickEntryProps.value = { doctype: props.doctype }
  nextTick(() => (show.value = false))
}

watch(
  () => document.doc,
  async (currentDoc) => {
    if (scripts.data?.length) {
      setupCustomizations(scripts.data, {
        doc: currentDoc,
        $dialog,
        $socket,
        router,
        toast,
        call,
      })
    }
  },
  { once: true },
)

watch(
  () => [doc.value.reference_doctype, doc.value.reference_docname],
  loadReferenceIdentity,
  { immediate: true },
)

watch(
  () => doc.value.reference_doctype,
  (value, previousValue) => {
    if (
      editing.value &&
      previousValue &&
      value !== previousValue &&
      document.doc.reference_docname
    ) {
      document.doc.reference_docname = ''
    }
  },
)

onMounted(async () => {
  document.doc = props.docname
    ? { ...document.doc, ...deepClone(props.defaults) }
    : {
        __newDocument: true,
        doctype: props.doctype,
        ...deepClone(props.defaults),
      }
  await triggerOnRender()
})
</script>
