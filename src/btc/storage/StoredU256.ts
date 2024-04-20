import { u256 } from 'as-bignum/assembly';
import { SafeMath } from '../types/SafeMath';
import { Address } from '../types/Address';
import { MemorySlotPointer } from '../memory/MemorySlotPointer';
import { Blockchain } from '../env';

export class StoredU256 {
    constructor(public address: Address, public pointer: u16, public subPointer: MemorySlotPointer, public value: u256) {
    }

    @operator('==')
    public static eq(a: StoredU256, b: StoredU256): bool {
        return a.value == b.value;
    }

    @operator('!=')
    public static notEq(a: StoredU256, b: StoredU256): bool {
        return a.value != b.value;
    }

    @operator('>')
    public static gt(a: StoredU256, b: StoredU256): bool {
        return a.value > b.value;
    }

    @operator('>=')
    public static gte(a: StoredU256, b: StoredU256): bool {
        return a.value >= b.value;
    }

    @operator('<')
    public static lt(a: StoredU256, b: StoredU256): bool {
        return a.value < b.value;
    }

    @operator('<=')
    public static lte(a: StoredU256, b: StoredU256): bool {
        return a.value <= b.value;
    }

    @operator('+')
    public static add(a: StoredU256, b: u256): StoredU256 {
        const val = SafeMath.add(a.value, b);
        Blockchain.setStorageAt(a.address, a.pointer, a.subPointer, val);

        return new StoredU256(a.address, a.pointer, a.subPointer, val);
    }

    @operator('-')
    public static sub(a: StoredU256, b: u256): StoredU256 {
        const val = SafeMath.sub(a.value, b);
        Blockchain.setStorageAt(a.address, a.pointer, a.subPointer, val);

        return new StoredU256(a.address, a.pointer, a.subPointer, SafeMath.sub(a.value, b));
    }

    @operator('*')
    public static mul(a: StoredU256, b: u256): StoredU256 {
        const val = SafeMath.mul(a.value, b);
        Blockchain.setStorageAt(a.address, a.pointer, a.subPointer, val);

        return new StoredU256(a.address, a.pointer, a.subPointer, SafeMath.mul(a.value, b));
    }

    @operator('&')
    public static and(a: StoredU256, b: u256): StoredU256 {
        return new StoredU256(a.address, a.pointer, a.subPointer, SafeMath.and(a.value, b));
    }

    @operator('|')
    public static or(a: StoredU256, b: u256): StoredU256 {
        return new StoredU256(a.address, a.pointer, a.subPointer, SafeMath.or(a.value, b));
    }

    @operator('^')
    public static xor(a: StoredU256, b: u256): StoredU256 {
        return new StoredU256(a.address, a.pointer, a.subPointer, SafeMath.xor(a.value, b));
    }

    @operator('>>')
    public static shr(a: StoredU256, b: u32): StoredU256 {
        return new StoredU256(a.address, a.pointer, a.subPointer, SafeMath.shr(a.value, b));
    }

    public toString(): string {
        return this.value.toString();
    }

    public toU256(): u256 {
        return this.value;
    }

    @operator.prefix('++')
    public inc(): StoredU256 {
        this.value = SafeMath.add(this.value, u256.One);

        Blockchain.setStorageAt(this.address, this.pointer, this.subPointer, this.value);
        return this;
    }

    @operator.prefix('--')
    public dec(): StoredU256 {
        this.value = SafeMath.sub(this.value, u256.One);

        Blockchain.setStorageAt(this.address, this.pointer, this.subPointer, this.value);
        return this;
    }

    @inline @operator.prefix('+')
    public unaryPlus(): StoredU256 {
        return this;
    }

    @operator.postfix('++')
    public incPostfix(): StoredU256 {
        const oldValue: u256 = this.value;
        this.value = SafeMath.add(this.value, u256.One);

        Blockchain.setStorageAt(this.address, this.pointer, this.subPointer, this.value);
        return new StoredU256(this.address, this.pointer, this.subPointer, oldValue);
    }

    @operator.postfix('--')
    public decPostfix(): StoredU256 {
        const oldValue: u256 = this.value;
        this.value = SafeMath.sub(this.value, u256.One);

        Blockchain.setStorageAt(this.address, this.pointer, this.subPointer, this.value);
        return new StoredU256(this.address, this.pointer, this.subPointer, oldValue);
    }

    public toUint8Array(): Uint8Array {
        return this.value.toUint8Array(true);
    }
}
