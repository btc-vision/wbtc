import { u256 } from 'as-bignum/assembly';
import { PointerReader } from './PointerReader';

class MemoryReader {
    private currentMemoryOffset: u8 = 0;
    private currentMemoryPointer: usize = 0;

    private currentPointer: PointerReader = this.getMemoryAtOffset();

    constructor() {

    }

    public addMemoryOffset(): void {
        this.currentMemoryOffset++;

        if (this.currentMemoryOffset >= 31) {
            this.currentMemoryOffset = 0;

            this.addMemoryPointer();
        }
    }

    public setMemoryPointer(pointer: u64): void {
        this.currentMemoryPointer = pointer;

        this.currentPointer = this.getMemoryAtOffset();
    }

    public resetMemoryOffset(): void {
        this.currentMemoryOffset = 0;
    }

    public getMemoryOffset(): u8 {
        return this.currentMemoryOffset;
    }

    public addMemoryPointer(): void {
        this.currentMemoryPointer++;

        this.currentPointer = this.getMemoryAtOffset();
    }

    public getMemoryPointer(): usize {
        return this.currentMemoryPointer;
    }

    public resetMemoryPointer(): void {
        this.currentMemoryPointer = 0;

        this.currentPointer = this.getMemoryAtOffset();
    }

    public readMemory(n: u64): u64 {
        return load<u8>(n);
    }

    public getMemoryAtOffset(): PointerReader {
        // we load the next 32 bytes from the offset
        return new PointerReader(load<u256>(this.getMemoryPointer(), 0));
    }

    // We must load 32 data by batch of 32 bytes starting at x offset. Data are stored as uint256.
    public readStringFromMemory(length: u16): string {
        let result = '';
        for (let i: u16 = 0; i < length; i++) {
            const currentPointerOffset: u8 = this.getMemoryOffset();
            const targetMemoryOffset: u16 = (currentPointerOffset + i) % 31;

            let data = this.currentPointer.getU8AtOffset(targetMemoryOffset as u8);
            result += String.fromCharCode(data);

            this.addMemoryOffset();
        }

        return result;
    }
}

export const memoryReader = new MemoryReader();
