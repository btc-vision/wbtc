import { u256 } from 'as-bignum/assembly';

const POINTER_END: u8 = 32;

export class PointerReader {
    private currentOffset: u8 = 0;
    private buffer: DataView;

    constructor(buffer: u256) {
        this.buffer = new DataView(buffer.toUint8Array().buffer);
    }

    public getU8AtOffset(offset: u8 = this.currentOffset): u8 {
        if (offset) {
            this.currentOffset = offset;
        }

        this.safeVerify(1);

        const val = this.buffer.getInt8(this.getOffset());
        this.currentOffset++;

        return val;
    }

    public getU16AtOffset(offset: u8 = this.currentOffset): u16 {
        if (offset) {
            this.currentOffset = offset;
        }

        this.safeVerify(2);

        const val = this.buffer.getUint16(this.getOffset(), true);
        this.currentOffset += 2;

        return val;
    }

    public getU32AtOffset(offset: u8 = this.currentOffset): u32 {
        if (offset) {
            this.currentOffset = offset;
        }

        this.safeVerify(4);

        const val = this.buffer.getUint32(this.getOffset(), true);
        this.currentOffset += 4;

        return val;
    }

    public getOffset(): u8 {
        return this.currentOffset;
    }

    private safeVerify(elementSize: u8, offset: u8 = this.currentOffset): void {
        if (offset) {
            this.currentOffset = offset;
        }

        if (this.getOffset() + elementSize >= POINTER_END) {
            throw new Error(`PointerReader: Out of bounds ${this.currentOffset + elementSize} >= ${POINTER_END}`);
        }
    }
}
