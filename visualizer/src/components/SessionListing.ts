import { defineComponent } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

export default defineComponent({
  name: 'SessionListing',
  components: { DataTable, Column },
  props: {
    sessions: { type: Array, required: true }
  },
  methods: {
    shotCount(row: any) {
      const shots = row.session?.shots || row.shots || [];
      return Array.isArray(shots) ? shots.length : 0;
    }
  },
  template: `
    <DataTable :value="sessions" data-testid="session-table">
      <Column field="session.date" header="Date" />
      <Column header="Shots" :body="shotCount" />
      <Column field="session.pk" header="PK" />
    </DataTable>
  `
});
