import { describe, it, expect } from "vitest";
import store from "../../src/store";
import { loadFromHandle } from "../../src/dataLoader";

function makeHandle(file) {
  return {
    name: 'dir',
    values: async function* () {
      yield {
        kind: 'file',
        name: file.name,
        getFile: async () => file
      };
    }
  };
}

describe("loadFromHandle", () => {
  it("parses session files", async () => {
    const file = new File(['{"pk":2,"shots":[] }'], 'b.json', { type: 'application/json' });
    const handle = makeHandle(file);
    await loadFromHandle(handle);
    expect(store.sessions[2]).toStrictEqual({ pk: 2, shots: [] });
  });
});
