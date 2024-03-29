import { Address } from '../types/Address';
import { BTCContract } from '../contracts/BTCContract';
import { MemorySlotPointer } from '../memory/MemorySlotPointer';
import { MemorySlotData } from '../memory/MemorySlot';
import { u256 } from 'as-bignum/assembly';
import { ContractDefaults } from '../lang/ContractDefaults';
import { ABIRegistry, Calldata } from '../universal/ABIRegistry';
import { BytesReader } from '../buffer/BytesReader';
import { Selector } from '../math/abi';
import { BytesWriter } from '../buffer/BytesWriter';

export type SubPointerStorage = Map<MemorySlotPointer, MemorySlotData<u256>>;
export type PointerStorage = Map<u16, SubPointerStorage>;
export type BlockchainStorage = Map<Address, PointerStorage>;

export type RequiredStorage = Map<Address, Map<u16, Set<MemorySlotPointer>>>;

export class BlockchainEnvironment {
    private requiredStorage: RequiredStorage = new Map();
    private storage: BlockchainStorage = new Map();
    private contracts: Map<Address, BTCContract> = new Map();

    private defaults: ContractDefaults = new ContractDefaults();
    private isInitialized: boolean = false;

    constructor() {

    }

    public requireInitialization(): void {
        if (!this.isInitialized) {
            throw new Error('Not initialized');
        }
    }

    public init(owner: Address, self: Address): ContractDefaults {
        if (this.isInitialized) {
            throw new Error('Already initialized');
        }

        this.defaults.loadContractDefaults(owner, self);

        this.isInitialized = true;

        return this.defaults;
    }

    public reset(): void {
        this.storage.clear();
        this.requiredStorage.clear();
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

        const result: BytesWriter = methodToCall.callMethod(method, calldata, self.self);

        return result.toBytesReader();
    }

    public getStorageAt(address: Address, pointer: u16, subPointer: MemorySlotPointer): MemorySlotData<u256> {
        this.ensureStorageAtAddress(address);

        const storage = this.storage.get(address);
        if (!storage) {
            throw new Error(`Storage for address ${address} not found`);
        }

        this.ensureStorageAtPointer(storage, pointer);

        const subStorage = storage.get(pointer);
        if (!subStorage) {
            throw new Error(`Sub-storage slot ${subPointer} not found for address ${address}`);
        }

        this.ensureStorageSubPointer(subStorage, subPointer);

        if (!subStorage.has(subPointer)) throw new Error(`Sub-storage slot ${subPointer} not found for address ${address}`);

        return subStorage.get(subPointer);
    }

    public hasStorageAt(address: Address, pointer: u16, subPointer: MemorySlotPointer): bool {
        const storage = this.storage.get(address);
        if (!storage) {
            return false;
        }

        if (!storage.has(pointer)) {
            return false;
        }

        const subStorage = storage.get(pointer);
        if (!subStorage) {
            return false;
        }

        return subStorage.has(subPointer);
    }

    public setStorageAt(address: Address, pointer: u16, keyPointer: MemorySlotPointer, value: MemorySlotData<u256>): void {
        this.ensureStorageAtAddress(address);

        const storage = this.storage.get(address);
        if (!storage) {
            throw new Error(`Storage for address ${address} not found`);
        }

        this.ensureStorageAtPointer(storage, pointer);

        const subStorage = storage.get(pointer);
        if (!subStorage) {
            throw new Error(`Sub-storage slot ${keyPointer} not found for address ${address}`);
        }

        subStorage.set(keyPointer, value);
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

    public requireStorage(address: Address, pointer: u16, subPointer: MemorySlotPointer): void {
        if (!this.requiredStorage.has(address)) {
            this.requiredStorage.set(address, new Map<u16, Set<MemorySlotPointer>>());
        }

        let slots = this.requiredStorage.get(address);
        if (!slots) {
            throw new Error(`Slots not found for address ${address}`);
        }

        if (!slots.has(pointer)) {
            slots.set(pointer, new Set<MemorySlotPointer>());
        }

        let subPointers = slots.get(pointer);
        if (!subPointers) {
            throw new Error(`Sub-pointers not found for pointer ${pointer}`);
        }

        subPointers.add(subPointer);

        this.requiredStorage.set(address, slots);
    }

    public getViewSelectors(): Uint8Array {
        return ABIRegistry.getViewSelectors();
    }

    public getMethodSelectors(): Uint8Array {
        return ABIRegistry.getMethodSelectors();
    }

    public loadStorage(data: Uint8Array): void {
        this.storage.clear();

        const memoryReader: BytesReader = new BytesReader(data);
        const contractsSize: u32 = memoryReader.readU16();

        for (let i: u32 = 0; i < contractsSize; i++) {
            const address: Address = memoryReader.readAddress();
            const storageSize: u32 = memoryReader.readU32();

            for (let j: u32 = 0; j < storageSize; j++) {
                const pointer: u16 = memoryReader.readU16();
                const subPointerSize: u32 = memoryReader.readU64();

                const subPointerStorage: SubPointerStorage = new Map<MemorySlotPointer, MemorySlotData<u256>>();
                for (let k: u32 = 0; k < subPointerSize; k++) {
                    const keyPointer: MemorySlotPointer = memoryReader.readU256();
                    const value: u256 = memoryReader.readU256();

                    subPointerStorage.set(keyPointer, value);
                }

                const storage: PointerStorage = new Map<u16, SubPointerStorage>();
                storage.set(pointer, subPointerStorage);

                this.storage.set(address, storage);
            }
        }
    }

    public storageToBytes(): Uint8Array {
        const memoryWriter: BytesWriter = new BytesWriter();

        memoryWriter.writeU32(this.storage.size);

        const keys: Address[] = this.storage.keys();
        const values: PointerStorage[] = this.storage.values();

        for (let i: u32 = 0; i < keys.length; i++) {
            const address: Address = keys[i];
            const storage: PointerStorage = values[i];

            memoryWriter.writeAddress(address);

            const subKeys: u16[] = storage.keys();
            const subValues: SubPointerStorage[] = storage.values();

            memoryWriter.writeU32(subKeys.length);

            for (let j: u32 = 0; j < subKeys.length; j++) {
                const pointer: u16 = subKeys[j];
                const subStorage: SubPointerStorage = subValues[j];

                memoryWriter.writeU16(pointer);
                memoryWriter.writeU64(subStorage.size);

                const subSubKeys: MemorySlotPointer[] = subStorage.keys();
                const subSubValues: MemorySlotData<u256>[] = subStorage.values();

                for (let k: u32 = 0; k < subSubKeys.length; k++) {
                    const keyPointer: MemorySlotPointer = subSubKeys[k];
                    const value: u256 = subSubValues[k];

                    memoryWriter.writeU256(keyPointer);
                    memoryWriter.writeU256(value);
                }
            }
        }

        return memoryWriter.getBuffer();
    }

    private ensureStorageAtAddress(address: Address): void {
        if (!this.storage.has(address)) {
            this.storage.set(address, new Map<u16, SubPointerStorage>());
        }
    }

    private ensureStorageAtPointer(storage: PointerStorage, pointer: u16): void {
        if (!storage.has(pointer)) {
            storage.set(pointer, new Map<MemorySlotPointer, MemorySlotData<u256>>());
        }
    }

    private ensureStorageSubPointer(subStorage: SubPointerStorage, subPointer: MemorySlotPointer): void {
        if (!subStorage.has(subPointer)) {
            subStorage.set(subPointer, new u256());
        }
    }
}
