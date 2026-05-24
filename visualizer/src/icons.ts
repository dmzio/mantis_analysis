import { defineComponent, h } from 'vue';

/**
 * Returns a component rendering a Material icon via span element.
 */
export function useCustomIcon(name: string) {
  return defineComponent({
    name: `${name}Icon`,
    render() {
      return h('span', { class: 'material-icons', 'aria-hidden': 'true' }, name);
    }
  });
}
