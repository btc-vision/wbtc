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

    public init(owner: Address, contractAddress: Address): ContractDefaults {
        if (this.isInitialized) {
            throw new Error('Already initialized');
        }

        this.defaults.loadContractDefaults(owner, contractAddress);

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

        const result: BytesWriter = methodToCall.callMethod(method, calldata, self.address);

        return result.toBytesReader();
    }

    public getStorageAt(address: Address, pointer: u16, subPointer: MemorySlotPointer): MemorySlotData<u256> {
        this.ensureStorageAtAddress(address);

        const storage = this.storage.get(address);
        if (!storage) {
            throw new Error(`Storage for address ${address} not found`);
        }

        const pointerHash = encodePointerHash(pointer, subPointer);
        this.ensureStorageAtPointer(storage, pointerHash);

        return storage.get(pointerHash);
    }

    public hasStorageAt(address: Address, pointer: u16, subPointer: MemorySlotPointer): bool {
        const storage = this.storage.get(address);
        if (!storage) {
            return false;
        }

        const pointerHash = encodePointerHash(pointer, subPointer);

        return storage.has(pointerHash);
    }

    public setStorageAt(address: Address, pointer: u16, keyPointer: MemorySlotPointer, value: MemorySlotData<u256>): void {
        this.ensureStorageAtAddress(address);

        const storage = this.storage.get(address);
        if (!storage) {
            throw new Error(`Storage for address ${address} not found`);
        }

        const pointerHash = encodePointerHash(pointer, keyPointer);
        this.ensureStorageAtPointer(storage, pointerHash);

        storage.set(pointerHash, value);
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
            this.requiredStorage.set(address, new Set<MemorySlotPointer>());
        }

        let slots = this.requiredStorage.get(address);
        if (!slots) {
            throw new Error(`Slots not found for address ${address}`);
        }

        const pointerHash = encodePointerHash(pointer, subPointer);
        if (!slots.has(pointerHash)) {
            slots.add(pointerHash);
        }

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
                const subPointerSize: u32 = memoryReader.readU32();

                for (let k: u32 = 0; k < subPointerSize; k++) {
                    const keyPointer: MemorySlotPointer = memoryReader.readU256();
                    const value: u256 = memoryReader.readU256();

                    this.setStorageAt(address, pointer, keyPointer, value);
                }
            }
        }
    }

    public storageToBytes(): Uint8Array {
        const memoryWriter: BytesWriter = new BytesWriter();

        memoryWriter.writeU32(this.storage.size);

        const keys: Address[] = this.storage.keys();
        const values: PointerStorage[] = this.storage.values();

        for (let i: i32 = 0; i < keys.length; i++) {
            const address: Address = keys[i];
            const storage: PointerStorage = values[i];

            memoryWriter.writeAddress(address);

            const subKeys: MemorySlotPointer[] = storage.keys();
            const subValues: MemorySlotData<u256>[] = storage.values();

            memoryWriter.writeU32(subKeys.length);

            for (let j: i32 = 0; j < subKeys.length; j++) {
                const pointer: MemorySlotPointer = subKeys[j];
                const value: MemorySlotData<u256> = subValues[j];

                memoryWriter.writeU256(pointer);
                memoryWriter.writeU256(value);
            }
        }

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

        return memoryWriter.getBuffer();
    }

    private ensureStorageAtAddress(address: Address): void {
        if (!this.storage.has(address)) {
            this.storage.set(address, new Map<u256, MemorySlotData<u256>>());
        }
    }

    private ensureStorageAtPointer(storage: PointerStorage, pointer: u256): void {
        if (!storage.has(pointer)) {
            storage.set(pointer, u256.Zero);
        }
    }
}
