import { createHash } from 'node:crypto';

export class ABICoder {
    constructor() {

    }

    public encodeSelector(name: string): string {
        // first 4 bytes of sha256 hash of the function signature

        const hash = createHash('sha256').update(name).digest();
        const selector = hash.slice(0, 4);

        return selector.toString('hex');
    }

    public numericSelectorToHex(selector: number): string {
        return selector.toString(16);
    }
}
