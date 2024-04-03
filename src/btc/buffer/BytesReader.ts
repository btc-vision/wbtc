import { Address, ADDRESS_BYTE_LENGTH } from '../types/Address';
import { Selector } from '../math/abi';
import { u256 } from 'as-bignum/assembly';

export class BytesReader {
    private readonly buffer: DataView;

    private currentOffset: i32 = 0;

    constructor(bytes: Uint8Array) {
        this.buffer = new DataView(bytes.buffer);
    }

    public readU8(): u8 {
        this.verifyEnd(this.currentOffset + 1);

        return this.buffer.getUint8(this.currentOffset++);
    }

    public readU16(): u16 {
        this.verifyEnd(this.currentOffset + 2);

        const value = this.buffer.getUint16(this.currentOffset, true);
        this.currentOffset += 2;

        return value;
    }

    public readU32(): u32 {
        this.verifyEnd(this.currentOffset + 4);

        const value = this.buffer.getUint32(this.currentOffset, true);
        this.currentOffset += 4;
        return value;
    }

    public readU64(): u64 {
        const low = this.readU32();
        const high = this.readU32();

        return (u64(high) << u64(32)) | low;
    }

    public readU256(): u256 {
        const next32Bytes: u8[] = [];
        for (let i = 0; i < 32; i++) {
            next32Bytes[i] = this.readU8();
        }

        return u256.fromBytesBE(next32Bytes);
    }

    public readBytes(length: u32, zeroStop: boolean = false): Uint8Array {
        let bytes = new Uint8Array(length);
        for (let i: u32 = 0; i < length; i++) {
            const byte = this.readU8();
            if (zeroStop && byte == 0) {
                continue;
            }

            bytes[i] = byte;
        }

        return bytes;
    }

    public readString(length: u16): string {
        const bytes = this.readBytes(length, true);

        return String.UTF8.decode(bytes.buffer);
    }

    public readSelector(): Selector {
        return this.readU32();
    }

    public readStringWithLength(): string {
        const length = this.readU16();

        return this.readString(length);
    }

    public readBoolean(): boolean {
        return this.readU8() !== 0;
    }

    public readFloat(): f32 {
        const value = this.buffer.getFloat32(this.currentOffset, true);
        this.currentOffset += 4;

        return value;
    }

    public readDouble(): f64 {
        const value = this.buffer.getFloat64(this.currentOffset, true);
        this.currentOffset += 8;

        return value;
    }

    public readAddress(): Address {
        return this.readString(ADDRESS_BYTE_LENGTH);
    }

    public getOffset(): i32 {
        return this.currentOffset;
    }

    public setOffset(offset: i32): void {
        this.currentOffset = offset;
    }

    public verifyEnd(size: i32): void {
        if (this.currentOffset > this.buffer.byteLength) {
            throw new Error(`Expected to read ${size} bytes but read ${this.currentOffset} bytes`);
        }
    }
}
