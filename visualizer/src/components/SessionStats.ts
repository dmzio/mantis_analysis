import { defineComponent } from 'vue';
import TraceVisualizer from './RawTraceVisualizer';

export default defineComponent({
  name: 'SessionStats',
  components: { TraceVisualizer },
  props: {
    shots: { type: Array, required: true }
  },
  template: `
    <div class="card session-stats">
      <h3>Session Stats</h3>
      <p class="stat-summary">Total shots: {{ shots.length }}</p>
      <TraceVisualizer :shots="shots" title="Raw trace" />
    </div>
  `
});
