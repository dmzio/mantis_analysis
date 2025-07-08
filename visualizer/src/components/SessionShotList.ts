import { defineComponent } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

export default defineComponent({
  name: 'SessionShotList',
  components: { DataTable, Column },
  props: {
    shots: { type: Array, required: true }
  },
  template: `
    <DataTable :value="shots" data-testid="shot-table" scrollable scrollHeight="flex">
      <Column field="pk" header="PK" />
      <Column field="score" header="Score" />
      <Column field="problem" header="Problem" />
    </DataTable>
  `
});
