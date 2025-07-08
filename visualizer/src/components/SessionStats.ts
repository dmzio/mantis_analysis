import { defineComponent } from 'vue';

export default defineComponent({
  name: 'SessionStats',
  props: {
    shots: { type: Array, required: true }
  },
  template: `
    <div class="session-stats">
      <h3>Session Stats</h3>
      <p>Total shots: {{ shots.length }}</p>
    </div>
  `
});
