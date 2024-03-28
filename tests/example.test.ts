import 'jest';

import * as wasmType from '../debug/debug.js';

// @ts-ignore
import * as wasm from '../debug/runDebug.js';

import { MemoryWriter } from '../helper/buffer/MemoryWriter';

describe('Test wasm module', () => {


    // @ts-ignore
    /*globalThis.env = {
        memory: memoryWriter.memory,
    };*/

    let module: typeof wasmType.CONTRACT | null = null;
    beforeEach(async () => {
        // @ts-ignore
        const moduleWasm = await wasm.promise;
        if (!moduleWasm) {
            throw new Error('Module not found');
        }

        const memory = moduleWasm.memory;
        const memoryWriter = new MemoryWriter(memory);
        memoryWriter.writeStringToMemory('bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297');

        module = moduleWasm.CONTRACT('bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297', 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');

        console.log(memoryWriter.uint8Array);
    });

    it('Loaded wasm', async () => {
        expect(module).not.toBe(null);
        expect(module).not.toBe(undefined);
    });

    it('add', async () => {
        console.log(module);
    });
});
