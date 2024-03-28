import { u256 } from 'as-bignum/assembly';


export class PointerReader {
    private currentOffset: u64 = 0;
    private buffer: DataView;

    constructor(buffer: u256) {
        this.buffer = new DataView(buffer.toUint8Array().buffer);
    }

    public getU8AtOffset(offset: u8): u8 {
        return this.buffer.getUint8(offset);
    }

    public getU16AtOffset(offset: u8): u16 {
        return this.buffer.getUint16(offset, true);
    }

    public getU32AtOffset(offset: u8): u32 {
        return this.buffer.getUint32(offset, true);
    }
}
