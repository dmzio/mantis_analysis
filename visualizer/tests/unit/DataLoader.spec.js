import { describe, it, expect, vi } from 'vitest';
import { loadFromHandle } from '../../src/dataLoader';
import store from '../../src/store';

function makeFileHandle(pk, order, idx, resolvers) {
  return {
    kind: 'file',
    name: `s${pk}.json`,
    getFile: vi.fn(() => {
      order.push(`get${idx}`);
      return new Promise(resolve => {
        resolvers[idx] = () => resolve({
          text: vi.fn(() => Promise.resolve(JSON.stringify({ pk })) )
        });
      });
    })
  };
}

describe('loadFromHandle', () => {
  it('reads multiple files in parallel', async () => {
    const order = [];
    const resolvers = [];
    const fh1 = makeFileHandle(1, order, 0, resolvers);
    const fh2 = makeFileHandle(2, order, 1, resolvers);
    const handle = {
      name: 'data',
      async *values() { yield fh1; yield fh2; }
    };

    const promise = loadFromHandle(handle);
    await new Promise(r => setTimeout(r));
    expect(order).toEqual(['get0', 'get1']);
    resolvers[0]();
    resolvers[1]();
    await promise;
    expect(store.sessions[1].pk).toBe(1);
    expect(store.sessions[2].pk).toBe(2);
  });
});
