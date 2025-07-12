import { defineComponent } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import { useRouter } from 'vue-router';
import { useCustomIcon } from '../icons';

const EyeIcon = useCustomIcon('visibility');

export default defineComponent({
  name: 'SessionShotList',
  components: { DataTable, Column, Button, EyeIcon },
  props: {
    shots: { type: Array, required: true },
    sessionPk: { type: Number, required: true }
  },
  setup(props) {
    const router = useRouter();
    return { router, props };
  },
  methods: {
    toDetails(row: any) {
      this.router.push(`/session/${this.sessionPk}/shot/${row.pk}`);
    }
  },
  template: `
    <div class="card">
      <DataTable :value="shots" data-testid="shot-table">
        <Column field="score" header="Score" />
        <Column field="percent_10" header="%∈10" />
        <Column field="length_1s" header="L₁s" />
        <Column field="delta_pull" header="Δpull" />
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
