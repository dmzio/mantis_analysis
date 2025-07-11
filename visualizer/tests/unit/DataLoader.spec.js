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
    store.sessions = {};
    store.processed = {};
    const order = [];
    const resolvers = [];
    const fh1 = makeFileHandle(1, order, 0, resolvers);
    const fh2 = makeFileHandle(2, order, 1, resolvers);
    const handle = {
      name: 'data',
      values() { return [fh1, fh2]; }
    };

    const promise = loadFromHandle(handle);
    await new Promise(r => setTimeout(r));
    expect(order).toEqual(['get0', 'get1']);
    resolvers[0]();
    resolvers[1]();
    await promise;
    expect(store.sessions[1].pk).toBe(1);
    expect(store.sessions[2].pk).toBe(2);
    expect(store.processed[1]).toBeUndefined();
  });

  it('stores processed shot data separately', async () => {
    store.sessions = {};
    store.processed = {};
    const fileHandle = {
      kind: 'file',
      name: 's1.json',
      getFile: vi.fn(() => Promise.resolve({
        text: vi.fn(() => Promise.resolve(
          JSON.stringify({
            pk: 1,
            shots: [{ pitch: [0, 0.1], yaw: [0, 0.1], shot_index: 1 }]
          })
        ))
      }))
    };
    const handle = {
      name: 'data',
      values() { return [fileHandle]; }
    };
    await loadFromHandle(handle);
    expect(store.sessions[1].shots).toBeDefined();
    expect(store.processed[1].shots[0].rel_pitch_moa).toBeDefined();
  });
});
