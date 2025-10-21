import { defineComponent } from 'vue';
import Image from 'primevue/image';
import TraceVisualizer from './RawTraceVisualizer';
import SessionShotGroup from './SessionShotGroup';

export default defineComponent({
  name: 'SessionStats',
  components: { TraceVisualizer, Image, SessionShotGroup },
  props: {
    shots: { type: Array, required: true },
    photo: { type: String, default: '' },
    processedShots: { type: Array, default: () => [] }
  },
  template: `
    <div class="card session-stats">
      <h3>Session Stats</h3>
      <p class="stat-summary">Total shots: {{ shots.length }}</p>
      <Image
        v-if="photo"
        :src="photo"
        alt="session photo"
        preview
        image-class="session-photo"
      />
      <TraceVisualizer :shots="shots" title="Raw trace" />
      <SessionShotGroup :shots="processedShots" />
    </div>
  `
});
