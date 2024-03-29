import 'jest';

// @ts-ignore
import * as wasm from '../debug/runDebug.js';
import { MotoSwapFactory } from '../src/MotoSwapFactory';

describe('Test wasm module', () => {
    const OWNER = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
    const CONTRACT_ADDRESS = 'bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297';

    let module: MotoSwapFactory | null = null;
    beforeEach(async () => {
        // @ts-ignore
        const moduleWasm = await wasm.promise;
        if (!moduleWasm) {
            throw new Error('Module not found');
        }

        module = moduleWasm.CONTRACT(OWNER, CONTRACT_ADDRESS);

        expect(module).not.toBe(null);
        expect(module).not.toBe(undefined);
    });

    it('Loaded wasm', async () => {
        expect(module).not.toBe(null);
        expect(module).not.toBe(undefined);
    });

    it('Contract owner to be owner.', async () => {
        if (!module) {
            throw new Error('Module not found');
        }

        console.log(module);

        const isOwnerContractOwner = module.isAddressOwner(OWNER);

        expect(isOwnerContractOwner).toBe(true);
    });
});
