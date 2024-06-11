import { Address, PotentialAddress } from '../types/Address';
import { MemorySlotPointer } from '../memory/MemorySlotPointer';
import { MemorySlotData } from '../memory/MemorySlot';
import { u256 } from 'as-bignum/assembly';
import { ContractDefaults } from '../lang/ContractDefaults';
import { ABIRegistry } from '../universal/ABIRegistry';
import { BytesReader } from '../buffer/BytesReader';
import { encodePointerHash } from '../math/abi';
import { BytesWriter } from '../buffer/BytesWriter';
import { MAX_EVENTS, NetEvent } from '../events/NetEvent';
import { Potential } from '../lang/Definitions';
import { OP_NET } from '../contracts/OP_NET';

export type PointerStorage = Map<MemorySlotPointer, MemorySlotData<u256>>;
export type BlockchainStorage = Map<Address, PointerStorage>;

@final
export class BlockchainEnvironment {
    private static readonly runtimeException: string = 'RuntimeException';

    public isInitialized: boolean = false;

    private storage: BlockchainStorage = new Map();
    private initializedStorage: BlockchainStorage = new Map();

    private externalCalls: Map<Address, Uint8Array[]> = new Map();
    private externalCallsResponse: Map<Address, Uint8Array[]> = new Map();

    private defaults: ContractDefaults = new ContractDefaults();
    private events: NetEvent[] = [];

    private _callee: PotentialAddress = null;
    private _caller: PotentialAddress = null;

    private contract: OP_NET | null = null;

    constructor() {
    }

    public requireInitialization(): void {
        if (!this.isInitialized) {
            throw this.error('Not initialized');
        }
    }

    public setContract(contract: OP_NET): void {
        if (this.contract !== null) {
            throw this.error('Contract already set');
        }

        this.contract = contract;
    }

    public purgeMemory(): void {
        this.storage.clear();
        this.initializedStorage.clear();

        this.events = [];

        this.externalCallsResponse.clear();
        this.externalCalls.clear();
    }

    public callee(): Address {
        if (!this._callee) {
            throw this.error('Callee is required');
        }

        return this._callee as Address;
    }

    public caller(): Address {
        if (!this._caller) {
            throw this.error('Caller is required');
        }

        return this._caller as Address;
    }

    public init(owner: Address, contractAddress: Address): void {
        if (this.isInitialized) {
            throw this.error(`Already initialized`);
        }

        this.defaults.loadContractDefaults(owner, contractAddress);
        this.isInitialized = true;

        return;
    }

    public setEnvironment(data: Uint8Array): void {
        const reader: BytesReader = new BytesReader(data);

        const caller: Address = reader.readAddress();
        const callee: Address = reader.readAddress();

        this._caller = caller;
        this._callee = callee;
    }

    public getDefaults(): ContractDefaults {
        return this.defaults;
    }

    public call(destinationContract: Address, calldata: BytesWriter): BytesReader {
        if (!this.isInitialized) {
            throw this.error('Not initialized');
        }

        if (destinationContract === this._callee) {
            throw this.error('Cannot call self');
        }

        if (!this.externalCalls.has(destinationContract)) {
            this.externalCalls.set(destinationContract, []);
        }

        const externalCalls = this.externalCalls.get(destinationContract);
        const buffer = calldata.getBuffer();
        externalCalls.push(buffer);

        const response: Potential<Uint8Array> = this.getExternalCallResponse(destinationContract, externalCalls.length - 1);
        if (!response) {
            throw this.error('external call failed');
        }

        return new BytesReader(response);
    }

    public getCalls(): Uint8Array {
        const buffer: BytesWriter = new BytesWriter();

        buffer.writeLimitedAddressBytesMap(this.externalCalls);
        this.externalCalls.clear();

        return buffer.getBuffer();
    }

    public loadCallsResponse(responses: Uint8Array): void {
        const memoryReader: BytesReader = new BytesReader(responses);

        this.externalCallsResponse = memoryReader.readMultiBytesAddressMap();
    }

    public addEvent(event: NetEvent): void {
        if (this.events.length >= i32(MAX_EVENTS)) {
            throw this.error(`Too many events in the same transaction.`);
        }

        this.events.push(event);
    }

    public getEvents(): Uint8Array {
        const eventLength: u8 = u8(this.events.length);
        if (eventLength > MAX_EVENTS) {
            throw this.error('Too many events');
        }

        const buffer: BytesWriter = new BytesWriter();
        buffer.writeU8(eventLength);

        for (let i: u8 = 0; i < eventLength; i++) {
            const event: NetEvent = this.events[i];

            buffer.writeStringWithLength(event.eventType);
            buffer.writeU64(event.getEventDataSelector());
            buffer.writeBytesWithLength(event.getEventData());
        }

        this.events = [];

        return buffer.getBuffer();
    }

    public getStorageAt(address: Address, pointer: u16, subPointer: MemorySlotPointer, defaultValue: MemorySlotData<u256>): MemorySlotData<u256> {
        this.ensureStorageAtAddress(address);

        const pointerHash: MemorySlotPointer = encodePointerHash(pointer, subPointer);
        this.ensureStorageAtPointer(address, pointerHash, defaultValue);

        const storage: PointerStorage = this.storage.get(address);

        // maybe find a better way for this
        const allKeys: u256[] = storage.keys();
        for (let i: i32 = 0; i < allKeys.length; i++) {
            const v: u256 = allKeys[i];

            if (u256.eq(v, pointerHash)) {
                return storage.get(v);
            }
        }

        return defaultValue;
    }

    public hasStorageAt(address: Address, pointer: u16, subPointer: MemorySlotPointer): bool {
        this.ensureStorageAtAddress(address);

        // We mark zero as the default value for the storage, if something is 0, the storage slot get deleted or is non-existent
        const val: u256 = this.getStorageAt(address, pointer, subPointer, u256.Zero);
        return val != u256.Zero;
    }

    public setStorageAt(address: Address, pointer: u16, keyPointer: MemorySlotPointer, value: MemorySlotData<u256>, defaultValue: MemorySlotData<u256>): void {
        this.ensureStorageAtAddress(address);

        const pointerHash: u256 = encodePointerHash(pointer, keyPointer);
        this.ensureStorageAtPointer(address, pointerHash, defaultValue);

        this._internalSetStorageAt(address, pointerHash, value);
    }

    public getViewSelectors(): Uint8Array {
        return ABIRegistry.getViewSelectors();
    }

    public getMethodSelectors(): Uint8Array {
        return ABIRegistry.getMethodSelectors();
    }

    public getWriteMethods(): Uint8Array {
        return ABIRegistry.getWriteMethods();
    }

    public loadStorage(data: Uint8Array): void {
        this.purgeMemory();

        const memoryReader: BytesReader = new BytesReader(data);
        const contractsSize: u32 = memoryReader.readU32();

        for (let i: u32 = 0; i < contractsSize; i++) {
            const address: Address = memoryReader.readAddress();
            const storageSize: u32 = memoryReader.readU32();

            this.ensureStorageAtAddress(address);
            const storage: PointerStorage = this.storage.get(address);

            for (let j: u32 = 0; j < storageSize; j++) {
                const keyPointer: MemorySlotPointer = memoryReader.readU256();
                const value: MemorySlotData<u256> = memoryReader.readU256();

                storage.set(keyPointer, value);
            }
        }

        memoryReader.purgeBuffer();
    }

    public storageToBytes(): Uint8Array {
        const memoryWriter: BytesWriter = new BytesWriter();
        memoryWriter.writeStorage(this.storage);

        this.storage.clear();

        return memoryWriter.getBuffer();
    }

    public initializedStorageToBytes(): Uint8Array {
        const memoryWriter: BytesWriter = new BytesWriter();
        memoryWriter.writeStorage(this.initializedStorage);

        this.initializedStorage.clear();

        return memoryWriter.getBuffer();
    }

    private requireInitialStorage(address: Address, pointerHash: u256, defaultValue: u256): void {
        if (!this.initializedStorage.has(address)) {
            this.initializedStorage.set(address, new Map<u256, MemorySlotData<u256>>());
        }

        const storage = this.initializedStorage.get(address);
        storage.set(pointerHash, defaultValue);
    }

    private getExternalCallResponse(destinationContract: Address, index: i32): Potential<Uint8Array> {
        if (!this.isInitialized) {
            throw this.error('Not initialized');
        }

        if (!this.externalCallsResponse.has(destinationContract)) {
            this.externalCallsResponse.set(destinationContract, []);
        }

        const externalCallsResponse = this.externalCallsResponse.get(destinationContract);
        return externalCallsResponse[index] || null;
    }

    private error(msg: string): Error {
        return new Error(`${BlockchainEnvironment.runtimeException}: ${msg}`);
    }

    private _internalSetStorageAt(address: Address, pointerHash: u256, value: MemorySlotData<u256>): void {
        const storage: PointerStorage = this.storage.get(address);
        const keys: u256[] = storage.keys();

        // Delete the old value, there is a bug with u256 and maps.
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];

            if (u256.eq(key, pointerHash)) {
                storage.delete(key);
            }
        }

        storage.set(pointerHash, value);
    }

    private ensureStorageAtAddress(address: Address): void {
        if (!this.storage.has(address)) {
            this.storage.set(address, new Map<u256, MemorySlotData<u256>>());
        }
    }

    private hasPointerStorageHash(storage: PointerStorage, pointer: MemorySlotPointer): bool {
        const keys = storage.keys();

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];

            if (u256.eq(key, pointer)) {
                return true;
            }
        }

        return false;
    }

    private ensureStorageAtPointer(address: Address, pointerHash: MemorySlotPointer, defaultValue: MemorySlotData<u256>): void {
        if (!this.storage.has(address)) {
            throw this.error(`Storage slot not found for address ${address}`);
        }

        // !!! -- IMPORTANT -- !!!. We have to tell the indexer that we need this storage slot to continue even if it's already defined.
        this.requireInitialStorage(address, pointerHash, defaultValue);

        const storage: PointerStorage = this.storage.get(address);
        if (!this.hasPointerStorageHash(storage, pointerHash)) {
            this._internalSetStorageAt(address, pointerHash, defaultValue);
        }
    }
}
