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
    shotCount(row: any) {
      const shots = row.shots || [];
      return Array.isArray(shots) ? shots.length : 0;
    },
    toDetails(row: any) {
      this.router.push(`/session/${row.pk}`);
    }
  },
  template: `
    <DataTable :value="sessions" data-testid="session-table" scrollable scrollHeight="flex">
      <Column field="date" header="Date" />
      <Column header="Shots" :body="shotCount" />
      <Column field="pk" header="PK" />
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
  `
});
