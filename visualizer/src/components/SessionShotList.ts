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
    },
    fmt(val: number): string {
      if (val === null || val === undefined) return '';
      const n = Number(val);
      if (!isFinite(n)) return String(val);
      const str = n.toPrecision(4);
      return parseFloat(str).toString();
    },
    fmtPercent(val: number): string {
      if (val === null || val === undefined) return '';
      return this.fmt(Number(val) * 100);
    },
    fmtSeconds(val: number | null | undefined): string {
      if (val === null || val === undefined) return '';
      const n = Number(val);
      if (!isFinite(n)) return '';
      return n.toFixed(2);
    }
  },
  template: `
    <div class="card">
      <DataTable :value="shots" data-testid="shot-table">
        <Column field="score" header="Score" />
        <Column field="percent_10" header="∈10, %">
          <template #body="slotProps">
            {{ fmtPercent(slotProps.data.percent_10) }}
          </template>
        </Column>
        <Column header="Hold, s">
          <template #body="slotProps">
            {{ fmtSeconds(slotProps.data.hold_duration_s) }}
          </template>
        </Column>
        <Column header="Split, s">
          <template #body="slotProps">
            {{ fmtSeconds(slotProps.data.split_s) }}
          </template>
        </Column>
        <Column field="length_1s" header="L₁s, mm">
          <template #body="slotProps">
            {{ fmt(slotProps.data.length_1s) }}
          </template>
        </Column>
        <Column field="delta_pull" header="Δpull, mm">
          <template #body="slotProps">
            {{ fmt(slotProps.data.delta_pull) }}
          </template>
        </Column>
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
