import { defineComponent } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { useRouter } from 'vue-router';

export default defineComponent({
  name: 'SessionShotList',
  components: { DataTable, Column },
  props: {
    shots: { type: Array, required: true },
    sessionPk: { type: Number, required: true }
  },
  setup(props) {
    const router = useRouter();
    const virtualOptions = {
      itemSize: 42,
      showLoader: false,
      delay: 0
    };
    return { router, props, virtualOptions };
  },
  methods: {
    toDetails(row: any) {
      this.router.push(`/session/${this.sessionPk}/shot/${row.pk}`);
    },
    shotHref(row: any) {
      if (!row?.pk) return '#';
      return `/session/${this.sessionPk}/shot/${row.pk}`;
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
      <DataTable
        :value="shots"
        data-testid="shot-table"
        size="small"
        scrollable
        scrollHeight="flex"
        :virtualScrollerOptions="virtualOptions"
      >
        <Column header="#" :style="{ width: '4rem' }">
          <template #body="slotProps">
            <a
              class="session-shotlist__link"
              :href="shotHref(slotProps.data)"
              :title="'Unique shot id ' + (slotProps.data.pk != null ? slotProps.data.pk : 'unknown')"
              @click.prevent="toDetails(slotProps.data)"
            >
              #{{ slotProps.index + 1 }}
            </a>
          </template>
        </Column>
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
      </DataTable>
    </div>
  `
});
