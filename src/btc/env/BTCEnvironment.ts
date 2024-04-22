import { Address } from '../types/Address';
import { OP_NET } from '../contracts/OP_NET';
import { MemorySlotPointer } from '../memory/MemorySlotPointer';
import { MemorySlotData } from '../memory/MemorySlot';
import { u256 } from 'as-bignum/assembly';
import { ContractDefaults } from '../lang/ContractDefaults';
import { ABIRegistry, Calldata } from '../universal/ABIRegistry';
import { BytesReader } from '../buffer/BytesReader';
import { encodePointerHash, Selector } from '../math/abi';
import { BytesWriter } from '../buffer/BytesWriter';
import { NetEvent } from '../events/NetEvent';

export type PointerStorage = Map<MemorySlotPointer, MemorySlotData<u256>>;
export type BlockchainStorage = Map<Address, PointerStorage>;

@final
export class BlockchainEnvironment {
    public isInitialized: boolean = false;

    private storage: BlockchainStorage = new Map();
    private initializedStorage: BlockchainStorage = new Map();

    private contracts: Map<Address, OP_NET> = new Map();
    private defaults: ContractDefaults = new ContractDefaults();

    private events: NetEvent[] = [];

    constructor() {
    }

    public requireInitialization(): void {
        if (!this.isInitialized) {
            throw new Error('Not initialized');
        }
    }

    public purgeMemory(): void {
        this.storage.clear();
        this.initializedStorage.clear();

        this.events = [];
    }

    public init(owner: Address, contractAddress: Address): void {
        if (this.isInitialized) {
            throw new Error('Already initialized');
        }

        this.defaults.loadContractDefaults(owner, contractAddress);

        this.isInitialized = true;

        return;
    }

    public getDefaults(): ContractDefaults {
        return this.defaults;
    }

    public call(self: OP_NET, destinationContract: Address, method: Selector, calldata: Calldata): BytesReader {
        const contract: OP_NET = this.contracts.get(destinationContract);
        if (!contract) {
            throw new Error(`Contract not found for address ${destinationContract}`);
        }

        const methodToCall: OP_NET | null = ABIRegistry.hasMethodByContract(contract, method);
        if (!methodToCall) {
            throw new Error(`Method not found for selector ${method}`);
        }

        const result: BytesWriter = methodToCall.callMethod(method, calldata, self.address);

        return result.toBytesReader();
    }

    public addEvent(event: NetEvent): void {
        this.events.push(event);
    }

    public getEvents(): Uint8Array {
        const buffer: BytesWriter = new BytesWriter();
        buffer.writeU32(this.events.length);

        for (let i: i32 = 0; i < this.events.length; i++) {
            const event: NetEvent = this.events[i];

            buffer.writeStringWithLength(event.eventType);
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
                //console.log(`Found key (${v}) with value: ${storage.get(v)} (${allKeys.length})`);

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

    public setContract(address: Address, contract: OP_NET): void {
        this.contracts.set(address, contract);
    }

    public hasContract(address: Address): bool {
        return this.contracts.has(address);
    }

    public getContract(address: Address): OP_NET {
        if (!this.contracts.has(address)) throw new Error(`Contract not found for address ${address}`);

        return this.contracts.get(address);
    }

    public requireInitialStorage(address: Address, pointerHash: u256, defaultValue: u256): void {
        if (!this.initializedStorage.has(address)) {
            this.initializedStorage.set(address, new Map<u256, MemorySlotData<u256>>());
        }

        const storage = this.initializedStorage.get(address);
        storage.set(pointerHash, defaultValue);
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

    public allocateMemory(num: usize): usize {
        return __alloc(num);
    }

    public deallocateMemory(pointer: i32): void {
        __free(pointer);
    }

    public growMemory(num: i32): i32 {
        const hasGrown: i32 = memory.grow(num);

        if (hasGrown < 0) {
            throw new Error('Memory could not be grown');
        }

        return hasGrown;
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

        //console.log(`[SET] setStorageAt: ${pointerHash} -> ${value}`);
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
            throw new Error(`Storage slot not found for address ${address}`);
        }

        // !!! -- IMPORTANT -- !!!. We have to tell the indexer that we need this storage slot to continue even if it's already defined.
        this.requireInitialStorage(address, pointerHash, defaultValue);

        const storage: PointerStorage = this.storage.get(address);
        if (!this.hasPointerStorageHash(storage, pointerHash)) {
            this._internalSetStorageAt(address, pointerHash, defaultValue);
        }
    }
}
