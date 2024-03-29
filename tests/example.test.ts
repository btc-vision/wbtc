import 'jest';

// @ts-ignore
import * as wasm from '../debug/runDebug.js';
import { MotoSwapFactory } from '../src/MotoSwapFactory';
import { MemoryWriter } from '../helper/buffer/MemoryWriter';
import { BinaryReader } from '../helper/abi/BinaryReader';

describe('Test wasm module', () => {
    const OWNER = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
    const CONTRACT_ADDRESS = 'bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297';

    let module: MotoSwapFactory | null = null;
    let memoryWriter: MemoryWriter | null = null;
    let moduleWasm: Awaited<typeof wasm.promise>;

    beforeEach(async () => {
        moduleWasm = await wasm.promise;

        if (!moduleWasm) {
            throw new Error('Module not found');
        }

        module = moduleWasm.CONTRACT(OWNER, CONTRACT_ADDRESS);
        memoryWriter = new MemoryWriter(moduleWasm.memory);

        expect(module).not.toBe(null);
        expect(module).not.toBe(undefined);
    });

    it('Contract owner to be owner.', async () => {
        if (!module) {
            throw new Error('Module not found');
        }

        if (!memoryWriter) {
            throw new Error('MemoryWriter not found');
        }

        const abi: Uint8Array = moduleWasm.getViewABI();
        const abiDecoder = new BinaryReader(abi);

        const decodedViewSelectors = abiDecoder.readViewSelectorsMap();
        const methodSelectors: Uint8Array = moduleWasm.getMethodABI();

        abiDecoder.setBuffer(methodSelectors);

        const decodedMethodSelectors = abiDecoder.readMethodSelectorsMap();

        console.log('ABI ->', decodedViewSelectors, decodedMethodSelectors);
    });
});
