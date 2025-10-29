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
    <div class="session-listing">
      <DataTable :value="sessions" data-testid="session-table" scrollable scrollHeight="flex" stripedRows>
        <Column field="fmtDate" header="Date" :headerClass="'no-wrap-cell'" :bodyClass="'no-wrap-cell'" />
        <Column field="drill_label" header="Drill" :headerClass="'no-wrap-cell'" :bodyClass="'truncate-cell'">
          <template #body="slotProps">
            <span class="session-listing__cell" :title="slotProps.data.drill_label || '—'">
              {{ slotProps.data.drill_label || '—' }}
            </span>
          </template>
        </Column>
        <Column field="firearm_label" header="Firearm" :headerClass="'no-wrap-cell'" :bodyClass="'truncate-cell'">
          <template #body="slotProps">
            <span class="session-listing__cell" :title="slotProps.data.firearm_label || '—'">
              {{ slotProps.data.firearm_label || '—' }}
            </span>
          </template>
        </Column>
        <Column field="duration_label" header="Duration" :headerClass="'no-wrap-cell'" :bodyClass="'no-wrap-cell'">
          <template #body="slotProps">
            {{ slotProps.data.duration_label || '—' }}
          </template>
        </Column>
        <Column field="shot_count" header="Shots" :headerClass="'no-wrap-cell'" :bodyClass="'no-wrap-cell align-right'">
          <template #body="slotProps">
            {{ slotProps.data.shot_count }}
          </template>
        </Column>
        <Column field="avg_score" header="Avg Score" :headerClass="'no-wrap-cell'" :bodyClass="'no-wrap-cell align-right'">
          <template #body="slotProps">
            {{ slotProps.data.avg_score !== null && slotProps.data.avg_score !== undefined ? slotProps.data.avg_score.toFixed(1) : '—' }}
          </template>
        </Column>
        <Column header="" :headerClass="'action-column'" :bodyClass="'action-column'">
          <template #body="slotProps">
            <Button
              class="p-button-text p-button-sm"
              @click="toDetails(slotProps.data)"
              :aria-label="'View ' + (slotProps.data.fmtDate || 'session') + ' session'"
            >
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
