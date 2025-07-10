import { defineComponent } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import { useRouter } from 'vue-router';
import { useCustomIcon } from '../icons';


const EyeIcon = useCustomIcon('visibility');

export default defineComponent({
  name: 'SessionListing',
  components: { DataTable, Column, Button, EyeIcon },
  props: {
    sessions: { type: Array, required: true }
  },
  setup() {
    const router = useRouter();
    return { router };
  },
  methods: {
    toDetails(row: any) {
      this.router.push(`/session/${row.pk}`);
    }
  },
  template: `
    <div class="card">
      <DataTable :value="sessions" data-testid="session-table" scrollable scrollHeight="flex">
        <Column field="fmtDate" header="Date" />
        <Column field="shot_count" header="Shots" />
        <Column header="">
          <template #body="slotProps">
            <Button class="p-button-text p-button-sm" @click="toDetails(slotProps.data)">
              <template #icon>
                <EyeIcon />
              </template>
            </Button>
          </template>
        </Column>
      </DataTable>
    </div>
  `
});
