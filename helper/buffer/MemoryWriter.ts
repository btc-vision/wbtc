import { PointerWriter } from './PointerWriter';

export class MemoryWriter {
    public memory: WebAssembly.Memory = new WebAssembly.Memory({ initial: 1024, maximum: 65536, shared: true });
    public uint8Array: Uint8Array = new Uint8Array(this.memory.buffer);

    private currentMemoryOffset: number = 0;
    private currentMemoryPointer: number = 0;

    private currentPointer: PointerWriter; // This would need to be implemented

    constructor() {
        this.currentPointer = this.getMemoryAtOffset();
    }

    public addMemoryOffset(): void {
        this.currentMemoryOffset++;

        if (this.currentMemoryOffset >= 31) {
            this.currentMemoryOffset = 0;
            this.addMemoryPointer();
        }
    }

    public setMemoryPointer(pointer: number): void {
        this.currentMemoryPointer = pointer;
        this.currentPointer = this.getMemoryAtOffset();
    }

    public resetMemoryOffset(): void {
        this.currentMemoryOffset = 0;
    }

    public getMemoryOffset(): number {
        return this.currentMemoryOffset;
    }

    public addMemoryPointer(): void {
        this.currentMemoryPointer++;
        this.currentPointer = this.getMemoryAtOffset();
    }

    public getMemoryPointer(): number {
        return this.currentMemoryPointer;
    }

    public resetMemoryPointer(): void {
        this.currentMemoryPointer = 0;
        this.currentPointer = this.getMemoryAtOffset();
    }

    public writeMemory(value: number, n: number): void {
        this.uint8Array[n] = value as number % 256;
    }

    public getMemoryAtOffset(): PointerWriter {
        const pointerStart = this.currentMemoryPointer * 32;
        const pointerEnd = pointerStart + 32;

        return new PointerWriter(this.uint8Array, pointerStart, pointerEnd);
    }

    public writeStringToMemory(str: string): void {
        for (let i = 0; i < str.length; i++) {
            const charCode = str.charCodeAt(i);

            this.currentPointer.writeU8(charCode, this.getMemoryOffset());
            this.addMemoryOffset();
        }
    }
}
