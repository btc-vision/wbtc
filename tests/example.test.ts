import 'jest';

import * as wasmType from '../debug/debug.js';

// @ts-ignore
import * as wasm from '../debug/runDebug.js';

import { MemoryWriter } from '../helper/buffer/MemoryWriter';

describe('Test wasm module', () => {
    const memoryWriter = new MemoryWriter();

    memoryWriter.writeStringToMemory('bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297');
    memoryWriter.writeStringToMemory('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');

    // @ts-ignore
    globalThis.env = {
        memory: memoryWriter.memory,
    };

    let module: typeof wasmType.CONTRACT | null = null;
    beforeEach(async () => {
        // @ts-ignore
        const moduleWasm = await wasm.promise;
        if (!moduleWasm) {
            throw new Error('Module not found');
        }

        module = moduleWasm.CONTRACT();
    });

    it('Loaded wasm', async () => {
        expect(module).not.toBe(null);
        expect(module).not.toBe(undefined);
    });

    it('add', async () => {
        console.log(module);
    });
});
