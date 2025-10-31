import { computed, defineComponent } from 'vue';
import Image from 'primevue/image';
import TraceVisualizer from './RawTraceVisualizer';
import SessionShotGroup from './SessionShotGroup';
import { formatDate } from '../dateFmt';

export default defineComponent({
  name: 'SessionStats',
  components: { TraceVisualizer, Image, SessionShotGroup },
  props: {
    shots: { type: Array, required: true },
    photo: { type: String, default: '' },
    processedShots: { type: Array, default: () => [] },
    session: { type: Object as () => Record<string, any>, default: () => ({}) }
  },
  setup(props) {
    const shotCount = computed(() => {
      const declared = props.session?.shot_count;
      if (typeof declared === 'number') return declared;
      if (typeof declared === 'string' && declared.trim()) {
        const parsed = Number(declared);
        if (!Number.isNaN(parsed)) return parsed;
      }
      return Array.isArray(props.shots) ? props.shots.length : 0;
    });

    const averageScore = computed(() => {
      const value = props.session?.average_score;
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? null : parsed;
      }
      return null;
    });

    const formattedScore = computed(() => {
      return averageScore.value !== null ? averageScore.value.toFixed(1) : '—';
    });

    const sessionLength = computed(() => {
      const display = props.session?.time_display || props.session?.time_bars;
      return display && typeof display === 'string' ? display : '—';
    });

    const sessionTitle = computed(() => {
      return props.session?.drill_name || props.session?.drill_display || 'Session overview';
    });

    const recordedAt = computed(() => {
      const stamp = props.session?.date || props.session?.time_stamp || props.session?.stamp;
      return stamp ? formatDate(stamp) : '';
    });

    const metaItems = computed(() => {
      const items = [
        recordedAt.value ? { label: 'Recorded', value: recordedAt.value } : null,
        props.session?.username ? { label: 'Shooter', value: props.session.username } : null,
        props.session?.gun_display || props.session?.firearm
          ? { label: 'Firearm', value: props.session.gun_display || props.session.firearm }
          : null,
        props.session?.fire_type_display
          ? { label: 'Fire Type', value: props.session.fire_type_display }
          : null,
        props.session?.right_handed_display
          ? { label: 'Handedness', value: props.session.right_handed_display }
          : null,
        props.session?.course_number
          ? { label: 'Course', value: props.session.course_number }
          : null
      ];
      return items.filter((item): item is { label: string; value: string } => Boolean(item?.value));
    });

    const metrics = computed(() => {
      return [
        { label: 'Average score', value: formattedScore.value, helper: averageScore.value !== null ? 'out of 100' : '' },
        { label: 'Shots captured', value: `${shotCount.value}` },
        { label: 'Session length', value: sessionLength.value }
      ];
    });

    const summary = computed(() => {
      const parts: string[] = [];
      parts.push(`${shotCount.value} shot${shotCount.value === 1 ? '' : 's'}`);
      if (sessionLength.value && sessionLength.value !== '—') {
        parts.push(`duration ${sessionLength.value}`);
      }
      if (averageScore.value !== null) {
        parts.push(`avg score ${averageScore.value.toFixed(1)}`);
      }
      return parts.length ? `Summary · ${parts.join(' • ')}` : '';
    });

    const hasPhoto = computed(() => Boolean(props.photo));

    return {
      metrics,
      metaItems,
      sessionTitle,
      summary,
      hasPhoto
    };
  },
  template: `
    <div class="card session-stats">
      <div class="session-stats__header">
        <div class="session-stats__title">
          <h2>{{ sessionTitle }}</h2>
          <p v-if="summary" class="session-stats__summary-line">{{ summary }}</p>
        </div>
        <dl v-if="metaItems.length" class="session-stats__meta">
          <div v-for="item in metaItems" :key="item.label" class="session-stats__meta-item">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>
      </div>

      <div class="session-stats__metrics">
        <div v-for="metric in metrics" :key="metric.label" class="session-metric">
          <span class="session-metric__label">{{ metric.label }}</span>
          <span class="session-metric__value">{{ metric.value }}</span>
          <span v-if="metric.helper" class="session-metric__helper">{{ metric.helper }}</span>
        </div>
      </div>

      <div :class="['session-stats__body', { 'session-stats__body--with-photo': hasPhoto }]">
        <div v-if="hasPhoto" class="session-stats__media">
          <Image
            :src="photo"
            alt="Session photo"
            preview
            image-class="session-photo"
          />
          <p class="session-photo__caption">Reference target from the session</p>
        </div>
        <div class="session-stats__visuals">
          <div class="session-stats__panel">
            <h4>Raw trace</h4>
            <TraceVisualizer :shots="shots" />
          </div>
          <div class="session-stats__panel">
            <h4>Impact spread</h4>
            <SessionShotGroup :shots="processedShots" />
          </div>
        </div>
      </div>
    </div>
  `
});
