import { defineComponent } from 'vue';
import TraceVisualizer from './TraceVisualizer';

export default defineComponent({
  name: 'SessionStats',
  components: { TraceVisualizer },
  props: {
    shots: { type: Array, required: true }
  },
  template: `
    <div class="session-stats">
      <h3>Session Stats</h3>
      <p>Total shots: {{ shots.length }}</p>
      <TraceVisualizer :shots="shots" />
    </div>
  `
});
