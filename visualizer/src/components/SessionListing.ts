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
      <DataTable
        :value="sessions"
        data-testid="session-table"
        scrollable
        scrollHeight="flex"
        stripedRows
        size="small"
        :tableStyle="{ tableLayout: 'fixed', width: '100%' }"
      >
        <Column
          field="fmtDate"
          header="Date"
          :style="{ width: '6.25rem' }"
          :headerClass="'no-wrap-cell'"
          :bodyClass="'no-wrap-cell'"
        />
        <Column
          field="drill_label"
          header="Drill"
          :style="{ minWidth: '12rem' }"
          :headerClass="'no-wrap-cell'"
          :bodyClass="'truncate-cell'"
        >
          <template #body="slotProps">
            <span class="session-listing__cell" :title="slotProps.data.drill_label || '—'">
              {{ slotProps.data.drill_label || '—' }}
            </span>
          </template>
        </Column>
        <Column
          field="duration_label"
          header="Duration"
          :style="{ width: '5.75rem' }"
          :headerClass="'no-wrap-cell'"
          :bodyClass="'no-wrap-cell'"
        >
          <template #body="slotProps">
            {{ slotProps.data.duration_label || '—' }}
          </template>
        </Column>
        <Column
          field="shot_count"
          header="Shots"
          :style="{ width: '5.5rem' }"
          :headerClass="'no-wrap-cell'"
          :bodyClass="'no-wrap-cell align-right'"
        >
          <template #body="slotProps">
            {{ slotProps.data.shot_count }}
          </template>
        </Column>
        <Column
          field="avg_score"
          header="Avg Score"
          :style="{ width: '6.5rem' }"
          :headerClass="'no-wrap-cell'"
          :bodyClass="'no-wrap-cell align-right'"
        >
          <template #body="slotProps">
            {{ slotProps.data.avg_score !== null && slotProps.data.avg_score !== undefined ? slotProps.data.avg_score.toFixed(1) : '—' }}
          </template>
        </Column>
        <Column header="" :style="{ width: '3rem' }" :headerClass="'action-column'" :bodyClass="'action-column'">
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
