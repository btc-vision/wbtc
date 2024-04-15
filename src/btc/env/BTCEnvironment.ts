import { Address } from '../types/Address';
import { BTCContract } from '../contracts/BTCContract';
import { MemorySlotPointer } from '../memory/MemorySlotPointer';
import { MemorySlotData } from '../memory/MemorySlot';
import { u256 } from 'as-bignum/assembly';
import { ContractDefaults } from '../lang/ContractDefaults';
import { ABIRegistry, Calldata } from '../universal/ABIRegistry';
import { BytesReader } from '../buffer/BytesReader';
import { encodePointerHash, Selector } from '../math/abi';
import { BytesWriter } from '../buffer/BytesWriter';

export type PointerStorage = Map<MemorySlotPointer, MemorySlotData<u256>>;
export type BlockchainStorage = Map<Address, PointerStorage>;

export type RequiredStorage = Map<Address, Set<MemorySlotPointer>>;

export class BlockchainEnvironment {
    public isInitialized: boolean = false;

    private requiredStorage: RequiredStorage = new Map();
    private storage: BlockchainStorage = new Map();
    private contracts: Map<Address, BTCContract> = new Map();
    private defaults: ContractDefaults = new ContractDefaults();

    constructor() {
    }

    public requireInitialization(): void {
        if (!this.isInitialized) {
            throw new Error('Not initialized');
        }
    }

    public purgeMemory(): void {
        this.storage.clear();
        this.requiredStorage.clear();
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

    public call(self: BTCContract, destinationContract: Address, method: Selector, calldata: Calldata): BytesReader {
        const contract: BTCContract = this.contracts.get(destinationContract);
        if (!contract) {
            throw new Error(`Contract not found for address ${destinationContract}`);
        }

        const methodToCall: BTCContract | null = ABIRegistry.hasMethodByContract(contract, method);
        if (!methodToCall) {
            throw new Error(`Method not found for selector ${method}`);
        }

        const result: BytesWriter = methodToCall.callMethod(method, calldata, self.address);

        return result.toBytesReader();
    }

    public getStorageAt(address: Address, pointer: u16, subPointer: MemorySlotPointer, defaultValue: MemorySlotData<u256>): MemorySlotData<u256> {
        this.ensureStorageAtAddress(address);

        const storage = this.storage.get(address);
        const pointerHash = encodePointerHash(pointer, subPointer);

        this.ensureStorageAtPointer(address, pointerHash, defaultValue);
        this.requireStorage(address, pointerHash);

        const allKeys: u256[] = storage.keys();
        for (let i: i32 = 0; i < allKeys.length; i++) {
            const v: u256 = allKeys[i];

            if (v == pointerHash) {
                return storage.get(v);
            }
        }

        return defaultValue;
    }

    public hasStorageAt(address: Address, pointer: u16, subPointer: MemorySlotPointer): bool {
        this.ensureStorageAtAddress(address);

        const storage: PointerStorage = this.storage.get(address);
        const pointerHash: u256 = encodePointerHash(pointer, subPointer);

        this.requireStorage(address, pointerHash);

        // dumb.
        const allKeys: u256[] = storage.keys();
        for (let i: i32 = 0; i < allKeys.length; i++) {
            const v: u256 = allKeys[i];

            if (v == pointerHash) {
                return true;
            }
        }

        return false;
    }

    public setStorageAt(address: Address, pointer: u16, keyPointer: MemorySlotPointer, value: MemorySlotData<u256>): void {
        this.ensureStorageAtAddress(address);

        const pointerHash = encodePointerHash(pointer, keyPointer);

        this._internalSetStorageAt(address, pointerHash, value);
    }

    public setContract(address: Address, contract: BTCContract): void {
        this.contracts.set(address, contract);
    }

    public hasContract(address: Address): bool {
        return this.contracts.has(address);
    }

    public getContract(address: Address): BTCContract {
        if (!this.contracts.has(address)) throw new Error(`Contract not found for address ${address}`);

        return this.contracts.get(address);
    }

    public requireStorage(address: Address, pointerHash: u256): void {
        if (!this.requiredStorage.has(address)) {
            this.requiredStorage.set(address, new Set<MemorySlotPointer>());
        }

        const slots = this.requiredStorage.get(address);
        if (!slots.has(pointerHash)) {
            slots.add(pointerHash);
        }
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
        this.growMemory(1);

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
    }

    public storageToBytes(): Uint8Array {
        const memoryWriter: BytesWriter = new BytesWriter();

        memoryWriter.writeStorage(this.storage);

        this.storage.clear();

        return memoryWriter.getBuffer();
    }

    public writeRequiredStorage(): Uint8Array {
        const memoryWriter: BytesWriter = new BytesWriter();

        memoryWriter.writeU32(this.requiredStorage.size);

        const keys: Address[] = this.requiredStorage.keys();
        const values: Set<MemorySlotPointer>[] = this.requiredStorage.values();

        for (let i: i32 = 0; i < keys.length; i++) {
            const address: Address = keys[i];
            const slots: Set<MemorySlotPointer> = values[i];

            memoryWriter.writeAddress(address);
            memoryWriter.writeU32(slots.size);

            const slotKeys: MemorySlotPointer[] = slots.values();
            for (let j: i32 = 0; j < slotKeys.length; j++) {
                const slot: MemorySlotPointer = slotKeys[j];
                memoryWriter.writeU256(slot);
            }
        }

        this.requiredStorage.clear();

        return memoryWriter.getBuffer();
    }

    private _internalSetStorageAt(address: Address, pointerHash: u256, value: MemorySlotData<u256>): void {
        this.requireStorage(address, pointerHash);

        const storage = this.storage.get(address);
        storage.set(pointerHash, value);
    }

    private ensureStorageAtAddress(address: Address): void {
        if (!this.storage.has(address)) {
            this.storage.set(address, new Map<u256, MemorySlotData<u256>>());
        }
    }

    private ensureStorageAtPointer(address: Address, pointerHash: u256, defaultValue: MemorySlotData<u256>): void {
        const storage = this.storage.get(address);

        if (!storage.has(pointerHash)) {
            this._internalSetStorageAt(address, pointerHash, defaultValue);
        }
    }
}
