import { computed, defineComponent } from 'vue';

/** Compact session summary shown from dashboard table preview triggers. */
export default defineComponent({
  name: 'SessionPreviewCard',
  props: {
    session: { type: Object as () => Record<string, any>, required: true },
    photo: { type: String, default: '' }
  },
  setup(props) {
    const title = computed(() => props.session.drill_label || props.session.drill_name || 'Session');
    const date = computed(() => props.session.fmtDate || props.session.date || '');
    const score = computed(() => {
      const value = props.session.avg_score ?? props.session.average_score;
      return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '—';
    });
    const shots = computed(() => {
      const value = props.session.shot_count;
      return typeof value === 'number' && Number.isFinite(value) ? `${value} shot${value === 1 ? '' : 's'}` : '—';
    });
    const duration = computed(() => props.session.duration_label || props.session.time_display || '—');
    const notes = computed(() => {
      const raw = props.session.notes || props.session.note || props.session.session_notes || '';
      return typeof raw === 'string' ? raw.trim() : '';
    });
    const metaItems = computed(() => [
      props.session.username ? { label: 'Shooter', value: props.session.username } : null,
      props.session.firearm_label || props.session.gun_display
        ? { label: 'Firearm', value: props.session.firearm_label || props.session.gun_display }
        : null,
      props.session.fire_type_display ? { label: 'Fire type', value: props.session.fire_type_display } : null
    ].filter((item): item is { label: string; value: string } => Boolean(item)));

    return {
      title,
      date,
      score,
      shots,
      duration,
      notes,
      metaItems
    };
  },
  template: `
    <article
      :class="[
        'session-preview-card',
        photo ? 'session-preview-card--with-photo' : 'session-preview-card--no-photo'
      ]"
      data-testid="session-preview-card"
    >
      <img
        v-if="photo"
        class="session-preview-card__photo"
        :src="photo"
        alt=""
      />
      <div class="session-preview-card__body">
        <header class="session-preview-card__header">
          <h3>{{ title }}</h3>
          <p v-if="date">{{ date }}</p>
        </header>
        <div class="session-preview-card__metrics">
          <span><strong>{{ score }}</strong><small>avg score</small></span>
          <span><strong>{{ shots }}</strong><small>captured</small></span>
          <span><strong>{{ duration }}</strong><small>duration</small></span>
        </div>
        <dl v-if="metaItems.length" class="session-preview-card__meta">
          <div v-for="item in metaItems" :key="item.label">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>
        <p v-if="notes" class="session-preview-card__notes">{{ notes }}</p>
      </div>
    </article>
  `
});
