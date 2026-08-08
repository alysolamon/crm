<template>
  <Editor
    ref="textEditor"
    v-model="content"
    :extensions="extensions"
    :placeholder="placeholder"
    :editable="editable"
    :upload-function="(file) => uploadFile(file, doctype, modelValue.name)"
  >
    <div class="relative w-full">
      <div class="flex flex-col gap-3">
        <div
          v-if="from.length"
          class="mx-4 flex items-center gap-2 border-t pt-2.5 h-10"
        >
          <span class="text-xs text-ink-gray-4">{{ __('FROM') }}:</span>
          <FormControl
            v-model="fromEmail"
            type="select"
            variant="ghost"
            class="w-full"
            :placeholder="__('')"
            :options="from"
          />
        </div>
        <div
          class="mx-4 flex items-center gap-2"
          :class="from.length ? '' : 'border-t pt-2.5'"
        >
          <span class="text-xs text-ink-gray-4 mr-2">{{ __('TO') }}:</span>
          <EmailMultiSelect
            v-model="toEmails"
            class="flex-1"
            variant="ghost"
            :validate="validateEmail"
            :fetchContacts="true"
            :error-message="
              (value) => __('{0} is an invalid email address', [value])
            "
          />
          <div class="flex gap-1.5">
            <Button
              :label="__('CC')"
              variant="ghost"
              :class="[
                cc
                  ? '!bg-surface-gray-4 hover:bg-surface-gray-3'
                  : '!text-ink-gray-4',
              ]"
              @click="toggleCC()"
            />
            <Button
              :label="__('BCC')"
              variant="ghost"
              :class="[
                bcc
                  ? '!bg-surface-gray-4 hover:bg-surface-gray-3'
                  : '!text-ink-gray-4',
              ]"
              @click="toggleBCC()"
            />
          </div>
        </div>
        <div v-if="cc" class="mx-4 flex items-center gap-2">
          <span class="text-xs text-ink-gray-4">{{ __('CC') }}:</span>
          <EmailMultiSelect
            ref="ccInput"
            v-model="ccEmails"
            class="flex-1"
            variant="ghost"
            :fetchContacts="true"
            :validate="validateEmail"
            :error-message="
              (value) => __('{0} is an invalid email address', [value])
            "
          />
        </div>
        <div v-if="bcc" class="mx-4 flex items-center gap-2">
          <span class="text-xs text-ink-gray-4">{{ __('BCC') }}:</span>
          <EmailMultiSelect
            ref="bccInput"
            v-model="bccEmails"
            class="flex-1"
            variant="ghost"
            :fetchContacts="true"
            :validate="validateEmail"
            :error-message="
              (value) => __('{0} is an invalid email address', [value])
            "
          />
        </div>
        <div class="mx-4 flex items-center gap-2 pb-2.5">
          <span class="text-xs text-ink-gray-4">{{ __('SUBJECT') }}:</span>
          <input
            v-model="subject"
            class="flex-1 border-none text-ink-gray-9 text-base bg-surface-base hover:bg-surface-base focus:border-none focus:!shadow-none focus-visible:!ring-0"
          />
        </div>
      </div>
      <EditorContent
        :style="editable ? { height: `${composerHeight}px` } : undefined"
        :class="[
          'prose-sm max-w-none [&_p.reply-to-content]:hidden',
          editable &&
            'mx-4 overflow-auto border-t py-3 [&_.ProseMirror]:min-h-full',
        ]"
      />
      <div
        v-if="editable"
        role="separator"
        aria-orientation="horizontal"
        :aria-label="__('Drag to resize the email editor')"
        :aria-valuemin="MIN_COMPOSER_HEIGHT"
        :aria-valuemax="maxComposerHeight"
        :aria-valuenow="composerHeight"
        tabindex="0"
        class="group mx-4 flex h-5 cursor-row-resize touch-none items-center justify-center border-t text-ink-gray-4 outline-none hover:text-ink-gray-7 focus-visible:ring-2 focus-visible:ring-outline-gray-3"
        :title="__('Drag up or down to resize')"
        @pointerdown="startComposerResize"
        @keydown="resizeComposerWithKeyboard"
      >
        <DragIcon class="transition-colors" />
      </div>
      <EditorTableMenu />
      <div v-if="editable" class="flex flex-col gap-2">
        <div class="flex flex-wrap gap-2 px-4">
          <AttachmentItem
            v-for="a in attachments"
            :key="a.file_url"
            :label="a.file_name"
          >
            <template #suffix>
              <span
                class="lucide-x h-3.5"
                aria-hidden="true"
                @click.stop="removeAttachment(a)"
              />
            </template>
          </AttachmentItem>
        </div>
        <div
          class="flex justify-between gap-2 overflow-hidden border-t px-4 py-2.5"
        >
          <div class="flex gap-1 items-center overflow-x-auto">
            <Button
              :tooltip="__('Insert Email Template')"
              variant="ghost"
              :icon="EmailTemplateIcon"
              @click="showEmailTemplateSelectorModal = true"
            />
            <FileUploader
              :upload-args="{
                doctype: doctype,
                docname: modelValue.name,
                private: true,
              }"
              @success="(f) => attachments.push(f)"
            >
              <template #default="{ openFileSelector }">
                <Button
                  :tooltip="__('Attach a File')"
                  :icon="AttachmentIcon"
                  variant="ghost"
                  @click="openFileSelector()"
                />
              </template>
            </FileUploader>
            <EditorFixedMenu :items="fullToolbar" />
            <IconPicker
              v-slot="{ togglePopover }"
              v-model="emoji"
              @update:modelValue="() => appendEmoji()"
            >
              <Button
                :tooltip="__('Insert Emoji')"
                :icon="SmileIcon"
                variant="ghost"
                @click="togglePopover()"
              />
            </IconPicker>
          </div>
          <div class="mt-2 flex items-center justify-end space-x-2 sm:mt-0">
            <Button v-bind="discardButtonProps || {}" :label="__('Discard')" />
            <Button
              v-if="saveDraftButtonProps"
              v-bind="saveDraftButtonProps"
              :label="__('Save draft')"
            />
            <Button
              variant="solid"
              v-bind="submitButtonProps || {}"
              :label="`${__('Send')} (${submitShortcutLabel})`"
            />
          </div>
        </div>
      </div>
    </div>
  </Editor>
  <EmailTemplateSelectorModal
    v-model="showEmailTemplateSelectorModal"
    :doctype="doctype"
    @apply="applyEmailTemplate"
  />
</template>

<script setup>
import IconPicker from '@/components/IconPicker.vue'
import SmileIcon from '@/components/Icons/SmileIcon.vue'
import EmailTemplateIcon from '@/components/Icons/EmailTemplateIcon.vue'
import AttachmentIcon from '@/components/Icons/AttachmentIcon.vue'
import DragIcon from '@/components/Icons/DragIcon.vue'
import AttachmentItem from '@/components/AttachmentItem.vue'
import EmailMultiSelect from '@/components/Controls/EmailMultiSelect.vue'
import EmailTemplateSelectorModal from '@/components/Modals/EmailTemplateSelectorModal.vue'
import {
  buildEditorExtensions,
  fullToolbar,
  uploadFile,
} from '@/components/editor/config'
import { FileUploader, call, FormControl } from 'frappe-ui'
import {
  Editor,
  EditorContent,
  EditorFixedMenu,
  EditorTableMenu,
} from 'frappe-ui/editor'
import { useTelemetry } from 'frappe-ui/frappe'
import { useDocument } from '@/data/document'
import { validateEmail, submitShortcutLabel } from '@/utils'
import Paragraph from '@tiptap/extension-paragraph'
import { useStorage } from '@vueuse/core'
import { ref, computed, nextTick, inject, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  placeholder: { type: String, default: null },
  editable: { type: Boolean, default: true },
  doctype: { type: String, default: 'CRM Lead' },
  subject: { type: String, default: __('Email From Lead') },
  editorProps: { type: Object, default: () => ({}) },
  submitButtonProps: { type: Object, default: () => ({}) },
  discardButtonProps: { type: Object, default: () => ({}) },
  saveDraftButtonProps: { type: Object, default: null },
  draftKey: { type: String, default: '' },
})

const CustomParagraph = Paragraph.extend({
  addAttributes() {
    return {
      class: {
        default: null,
        renderHTML: (attributes) => {
          if (!attributes.class) {
            return {}
          }
          return {
            class: `${attributes.class}`,
          }
        },
      },
    }
  },
})

const modelValue = defineModel({ type: Object })
const attachments = defineModel('attachments', {
  type: Array,
  default: () => [],
})
const content = defineModel('content', { type: String, default: '' })

const { capture } = useTelemetry()
const { user: sessionUser } = inject('session')
const { document: user } = useDocument('User', sessionUser)

const textEditor = ref(null)
const cc = ref(false)
const bcc = ref(false)
const emoji = ref('')
const MIN_COMPOSER_HEIGHT = 224
const maxComposerHeight = computed(() =>
  typeof window === 'undefined'
    ? 720
    : Math.max(MIN_COMPOSER_HEIGHT, Math.floor(window.innerHeight * 0.7)),
)
const composerHeight = useStorage(
  `emailComposerHeight-${props.draftKey || 'temporary'}`,
  320,
)
let resizeStartY = 0
let resizeStartHeight = 0

function clampComposerHeight(height) {
  return Math.min(
    maxComposerHeight.value,
    Math.max(MIN_COMPOSER_HEIGHT, height),
  )
}

function startComposerResize(event) {
  event.preventDefault()
  resizeStartY = event.clientY
  resizeStartHeight = Number(composerHeight.value)
  document.body.style.cursor = 'row-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('pointermove', resizeComposer)
  window.addEventListener('pointerup', stopComposerResize, { once: true })
}

function resizeComposer(event) {
  composerHeight.value = clampComposerHeight(
    resizeStartHeight + event.clientY - resizeStartY,
  )
}

function stopComposerResize() {
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  window.removeEventListener('pointermove', resizeComposer)
}

function resizeComposerWithKeyboard(event) {
  if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return
  event.preventDefault()
  const delta = event.key === 'ArrowDown' ? 32 : -32
  composerHeight.value = clampComposerHeight(
    Number(composerHeight.value) + delta,
  )
}

onBeforeUnmount(stopComposerResize)

const savedEnvelope = useStorage(
  `emailEnvelope-${props.draftKey || 'temporary'}`,
  {
    subject: props.subject,
    fromEmail: '',
    toEmails: modelValue.value.email ? [modelValue.value.email] : [],
    ccEmails: [],
    bccEmails: [],
    cc: false,
    bcc: false,
  },
  localStorage,
  { mergeDefaults: true },
)
const subject = ref(savedEnvelope.value.subject || props.subject)
const fromEmail = ref(savedEnvelope.value.fromEmail || '')
const toEmails = ref(
  savedEnvelope.value.toEmails?.length
    ? savedEnvelope.value.toEmails
    : modelValue.value.email
      ? [modelValue.value.email]
      : [],
)
const ccEmails = ref(savedEnvelope.value.ccEmails || [])
const bccEmails = ref(savedEnvelope.value.bccEmails || [])
cc.value = Boolean(savedEnvelope.value.cc || ccEmails.value.length)
bcc.value = Boolean(savedEnvelope.value.bcc || bccEmails.value.length)
const ccInput = ref(null)
const bccInput = ref(null)

watch(
  [subject, fromEmail, toEmails, ccEmails, bccEmails, cc, bcc],
  () => {
    savedEnvelope.value = {
      subject: subject.value,
      fromEmail: fromEmail.value,
      toEmails: toEmails.value,
      ccEmails: ccEmails.value,
      bccEmails: bccEmails.value,
      cc: cc.value,
      bcc: bcc.value,
    }
  },
  { deep: true },
)

const extensions = buildEditorExtensions({
  starterKit: { paragraph: false },
  extra: [CustomParagraph],
})

const from = computed(() => {
  if (!user.doc || !user.doc.user_emails?.length) return []
  let emails = user.doc.user_emails.map((e) => {
    return {
      label: e.email_account + ' <' + e.email_id + '>',
      value: e.email_id,
    }
  })

  if (emails.length == 1 && emails[0].email_id === sessionUser) return []

  return emails
})

watch(
  from,
  (fromOptions) => {
    if (!fromOptions.find((f) => f.value === fromEmail.value)) {
      fromEmail.value = fromOptions.length ? fromOptions[0].value : ''
    }
  },
  { immediate: true },
)

const editor = computed(() => textEditor.value?.editor)

function removeAttachment(attachment) {
  attachments.value = attachments.value.filter((a) => a !== attachment)
}

const showEmailTemplateSelectorModal = ref(false)

async function applyEmailTemplate(template) {
  let data = await call(
    'frappe.email.doctype.email_template.email_template.get_email_template',
    {
      template_name: template.name,
      doc: modelValue.value,
    },
  )

  if (template.subject) {
    subject.value = data.subject
  }

  if (template.response) {
    content.value = data.message
  }
  showEmailTemplateSelectorModal.value = false
  capture('email_template_applied', { doctype: props.doctype })
}

function appendEmoji() {
  editor.value.commands.insertContent(emoji.value)
  editor.value.commands.focus()
  emoji.value = ''
  capture('emoji_inserted_in_email', { emoji: emoji.value })
}

function toggleCC() {
  cc.value = !cc.value
  if (cc.value) nextTick(() => ccInput.value.setFocus())
}

function toggleBCC() {
  bcc.value = !bcc.value
  if (bcc.value) nextTick(() => bccInput.value.setFocus())
}

function clearDraft() {
  subject.value = props.subject
  fromEmail.value = ''
  toEmails.value = modelValue.value.email ? [modelValue.value.email] : []
  ccEmails.value = []
  bccEmails.value = []
  cc.value = false
  bcc.value = false
  savedEnvelope.value = {
    subject: props.subject,
    fromEmail: '',
    toEmails: toEmails.value,
    ccEmails: [],
    bccEmails: [],
    cc: false,
    bcc: false,
  }
}

defineExpose({
  editor,
  subject,
  cc,
  bcc,
  fromEmail,
  toEmails,
  ccEmails,
  bccEmails,
  clearDraft,
})
</script>
