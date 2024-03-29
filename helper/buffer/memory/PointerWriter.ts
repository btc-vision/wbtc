export class PointerWriter {
    private currentOffset: number = 0;
    private buffer: DataView;

    constructor(buffer: Uint8Array, private readonly pointerStart: number, private readonly pointerEnd: number) {
        this.buffer = new DataView(buffer.buffer);
    }

    public writeU8(value: number, offset: number = this.currentOffset): void {
        if (offset) {
            this.currentOffset = offset;
        }

        this.safeVerify(1);

        this.buffer.setUint8(this.getOffset(), value);
        this.currentOffset++;
    }

    public writeU16(value: number, offset: number = this.currentOffset): void {
        if (offset) {
            this.currentOffset = offset;
        }

        this.safeVerify(2);

        this.buffer.setUint16(this.getOffset(), value, true);
        this.currentOffset += 2;
    }

    public writeU32(value: number, offset: number = this.currentOffset): void {
        if (offset) {
            this.currentOffset = offset;
        }

        this.safeVerify(4);

        this.buffer.setUint32(this.getOffset(), value, true);
        this.currentOffset += 4;
    }

    public writeU64(value: number, offset: number = this.currentOffset): void {
        if (offset) {
            this.currentOffset = offset;
        }

        this.safeVerify(8);

        this.buffer.setBigUint64(this.getOffset(), BigInt(value), true);
        this.currentOffset += 8;
    }

    public getOffset(): number {
        return this.currentOffset + this.pointerStart;
    }

    private safeVerify(elementSize: number, offset: number = this.currentOffset): void {
        if (offset) {
            this.currentOffset = offset;
        }

        if (this.getOffset() + elementSize >= this.pointerEnd) {
            throw new Error(`PointerWriter: Out of bounds ${this.pointerStart + this.currentOffset + elementSize} >= ${this.pointerEnd}`);
        }
    }
}
