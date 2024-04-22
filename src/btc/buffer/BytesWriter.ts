import { u256 } from 'as-bignum/assembly';
import { Address, ADDRESS_BYTE_LENGTH } from '../types/Address';
import { Selector } from '../math/abi';
import { BytesReader } from './BytesReader';
import { MethodMap, PropertyABIMap, SelectorsMap } from '../universal/ABIRegistry';
import { MemorySlotPointer } from '../memory/MemorySlotPointer';
import { MemorySlotData } from '../memory/MemorySlot';
import { BlockchainStorage, PointerStorage } from '../env/BTCEnvironment';

@final
export class BytesWriter {
    private currentOffset: u32 = 0;
    private buffer: DataView = new DataView(new ArrayBuffer(4));

    constructor() {

    }

    public writeU8(value: u8): void {
        this.allocSafe(1);
        this.buffer.setUint8(this.currentOffset++, value);
    }

    public writeU16(value: u16): void {
        this.allocSafe(2);
        this.buffer.setUint16(this.currentOffset, value, true);
        this.currentOffset += 2;
    }

    public writeU32(value: u32): void {
        this.allocSafe(4);
        this.buffer.setUint32(this.currentOffset, value, true);
        this.currentOffset += 4;
    }

    public writeU64(value: u64): void {
        this.writeU32(u32(value));
        this.writeU32(u32(value >> u64(32)));
    }

    public writeStorage(storage: BlockchainStorage): void {
        this.writeU32(storage.size);

        const keys: Address[] = storage.keys();
        const values: PointerStorage[] = storage.values();

        for (let i: i32 = 0; i < keys.length; i++) {
            const address: Address = keys[i];
            const storage: PointerStorage = values[i];

            this.writeAddress(address);

            const subKeys: MemorySlotPointer[] = storage.keys();
            const subValues: MemorySlotData<u256>[] = storage.values();

            this.writeU32(subKeys.length);

            for (let j: i32 = 0; j < subKeys.length; j++) {
                const pointer: MemorySlotPointer = subKeys[j];
                const value: MemorySlotData<u256> = subValues[j];

                this.writeU256(pointer);
                this.writeU256(value);
            }
        }
    }

    public writeSelector(value: Selector): void {
        this.writeU32(value);
    }

    public writeBoolean(value: boolean): void {
        this.writeU8(value ? 1 : 0);
    }

    public writeU256(value: u256): void {
        const bytes = value.toUint8Array(true);
        for (let i: i32 = 0; i < 32; i++) {
            this.writeU8(bytes[i] || 0);
        }
    }

    public writeTuple(value: u256[]): void {
        this.writeU32(u32(value.length));

        for (let i = 0; i < value.length; i++) {
            this.writeU256(value[i]);
        }
    }

    public writeBytes(value: Uint8Array): void {
        for (let i = 0; i < value.length; i++) {
            this.writeU8(value[i]);
        }
    }

    public writeBytesWithLength(value: Uint8Array): void {
        this.writeU32(u32(value.length));

        for (let i = 0; i < value.length; i++) {
            this.writeU8(value[i]);
        }
    }

    public writeString(value: string): void {
        for (let i: i32 = 0; i < value.length; i++) {
            this.writeU8(u8(value.charCodeAt(i)));
        }
    }

    public writeAddress(value: Address): void {
        const bytes = this.fromAddress(value);

        this.writeBytes(bytes);
    }

    public writeStringWithLength(value: string): void {
        this.writeU16(u16(value.length));

        this.writeString(value);
    }

    public writeViewSelectorMap(map: SelectorsMap): void {
        this.writeU16(u16(map.size));

        const keys = map.keys();
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const value = map.get(key);

            this.writeAddress(key.address);
            this.writeSelectors(value);
        }
    }

    public writeMethodSelectorsMap(map: MethodMap): void {
        this.writeU16(u16(map.size));

        const keys = map.keys();
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const value = map.get(key);

            this.writeAddress(key.address);
            this.writeMethodSelectorMap(value);
        }
    }

    public getBuffer(): Uint8Array {
        const buf = new Uint8Array(this.buffer.byteLength);
        for (let i: u32 = 0; i < u32(this.buffer.byteLength); i++) {
            buf[i] = this.buffer.getUint8(i);
        }

        this.clear();

        return buf;
    }

    public toBytesReader(): BytesReader {
        return new BytesReader(this.getBuffer());
    }

    public getOffset(): u32 {
        return this.currentOffset;
    }

    public setOffset(offset: u32): void {
        this.currentOffset = offset;
    }

    public clear(): void {
        this.currentOffset = 0;
        this.buffer = new DataView(new ArrayBuffer(4));
    }

    public allocSafe(size: u32): void {
        if (this.currentOffset + size > u32(this.buffer.byteLength)) {
            this.resize(size);
        }
    }

    public writeABISelector(name: string, selector: Selector): void {
        this.writeStringWithLength(name);
        this.writeSelector(selector);
    }

    private getChecksum(): u32 {
        let checksum: u32 = 0;
        for (let i = 0; i < this.buffer.byteLength; i++) {
            checksum += this.buffer.getUint8(i);
        }

        return checksum % (2 ** 32);
    }

    private writeMethodSelectorMap(value: Set<Selector>): void {
        this.writeU16(u16(value.size));

        const keys = value.values();
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];

            this.writeSelector(key);
        }
    }

    private writeSelectors(value: PropertyABIMap): void {
        this.writeU16(u16(value.size));

        const keys = value.values();
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];

            this.writeBytes(key);
        }
    }

    private fromAddress(value: Address): Uint8Array {
        if (value.length > i32(ADDRESS_BYTE_LENGTH)) {
            throw new Error('Address is too long');
        }

        const bytes: Uint8Array = new Uint8Array(ADDRESS_BYTE_LENGTH);
        for (let i: i32 = 0; i < value.length; i++) {
            bytes[i] = value.charCodeAt(i);
        }

        for (let i: u8 = u8(value.length); i < ADDRESS_BYTE_LENGTH; i++) {
            bytes[i] = 0;
        }

        return bytes;
    }

    private resize(size: u32): void {
        const buf: Uint8Array = new Uint8Array(u32(this.buffer.byteLength) + size);

        for (let i: i32 = 0; i < this.buffer.byteLength; i++) {
            buf[i] = this.buffer.getUint8(i);
        }

        this.buffer = new DataView(buf.buffer);
    }
}
