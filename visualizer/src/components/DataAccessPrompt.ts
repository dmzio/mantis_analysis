import { defineComponent, ref } from 'vue';
import Button from 'primevue/button';
import { requestDataAccessForRoute } from '../dataLoader';

export default defineComponent({
  name: 'DataAccessPrompt',
  components: { Button },
  props: {
    message: {
      type: String,
      default: 'Select the session export folder to continue.'
    }
  },
  emits: ['loaded', 'failed'],
  setup(props, { emit }) {
    const busy = ref(false);
    const input = ref<HTMLInputElement | null>(null);
    const localMessage = ref(props.message);

    const applyResult = (result: Awaited<ReturnType<typeof requestDataAccessForRoute>>) => {
      if (result.status === 'ready') {
        emit('loaded');
        return;
      }
      localMessage.value = result.message || props.message;
      emit('failed', result);
    };

    const selectFolder = async () => {
      if (busy.value) return;
      busy.value = true;
      try {
        if ('showDirectoryPicker' in window) {
          applyResult(await requestDataAccessForRoute());
          return;
        }
        input.value?.click();
      } finally {
        busy.value = false;
      }
    };

    const chooseFiles = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const files = Array.from(target.files || []);
      if (!files.length) return;
      busy.value = true;
      try {
        applyResult(await requestDataAccessForRoute(files));
      } finally {
        busy.value = false;
        target.value = '';
      }
    };

    return { busy, input, localMessage, selectFolder, chooseFiles };
  },
  template: `
    <div class="data-access-prompt" data-testid="data-access-prompt">
      <p>{{ localMessage }}</p>
      <Button
        label="Select Folder"
        icon="pi pi-folder-open"
        :loading="busy"
        data-testid="data-access-select"
        @click="selectFolder"
      />
      <input ref="input" type="file" multiple style="display:none" @change="chooseFiles" />
    </div>
  `
});
