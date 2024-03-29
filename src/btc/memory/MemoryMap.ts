import { MemorySlotPointer } from './MemorySlotPointer';

export class MemoryMap<K, V> extends Map<K, V> {
    public pointer: MemorySlotPointer;

    constructor(pointer: MemorySlotPointer) {
        super();

        this.pointer = pointer;
    }

    public set(key: K, value: V): this {
        return <this>super.set(key, value);
    }

    public get(key: K): V {
        return super.get(key);
    }

    public has(key: K): bool {
        return super.has(key);
    }

    public delete(key: K): bool {
        return super.delete(key);
    }

    public clear(): void {
        super.clear();
    }
}
