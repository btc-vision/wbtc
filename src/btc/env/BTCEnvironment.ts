import { Address } from '../types/Address';
import { BTCContract } from '../contracts/BTCContract';
import { MemorySlotPointer } from '../memory/MemorySlotPointer';
import { MemorySlotData } from '../memory/MemorySlot';
import { EvaluatedResult } from './types/EvaluatedResult';
import { u256 } from 'as-bignum/assembly';
import { ContractDefaults } from '../lang/ContractDefaults';

export type BlockchainStorage = Map<Address, Map<MemorySlotPointer, MemorySlotData>>;


export class BlockchainEnvironment {
    private requiredStorage: Map<Address, Set<MemorySlotPointer>> = new Map();
    private storage: BlockchainStorage = new Map();
    private contracts: Map<Address, BTCContract> = new Map();

    private defaults: ContractDefaults = new ContractDefaults();

    constructor() {

    }

    public init(): ContractDefaults {
        this.defaults.loadContractDefaults();

        return this.defaults;
    }

    public reset(): void {
        this.storage.clear();
        this.requiredStorage.clear();
    }

    public getStorageAt(address: Address, pointer: MemorySlotPointer): MemorySlotData {
        const storage = this.storage.get(address);
        if (!storage) {
            throw new Error(`Storage for address ${address} not found`);
        }

        if (!storage.has(pointer)) {
            throw new Error(`Storage slot ${pointer} not found for address ${address}`);
        }

        return storage.get(pointer);
    }

    public setStorageAt(address: Address, pointer: MemorySlotPointer, value: MemorySlotData): void {
        const storage = this.storage.get(address);

        if (!storage) {
            throw new Error(`Storage for address ${address} not found`);
        }

        storage.set(pointer, value);
    }

    public setContract(address: Address, contract: BTCContract): void {
        this.contracts.set(address, contract);
    }

    public getContract(address: Address): BTCContract {
        return this.contracts.get(address);
    }

    public requireStorage(address: Address, pointer: MemorySlotPointer): void {
        let slots = this.requiredStorage.get(address) || new Set<MemorySlotPointer>();
        slots.add(pointer);

        this.requiredStorage.set(address, slots);
    }


    public loadStorage(address: Address, pointers: MemorySlotPointer[], data: Uint64Array[]): void {
        this.storage.clear();

        const storage: Map<MemorySlotPointer, MemorySlotData> = new Map<MemorySlotPointer, MemorySlotData>();
        for (let i: i16 = 0; i < pointers.length; i++) {
            if (!data[i]) throw new Error(`Data for slot ${pointers[i]} not found`);

            let value = data[i];
            if (value.length != 4) throw new Error(`Invalid data length for slot ${pointers[i]}`);


            storage.set(pointers[i], new u256(value[0], value[1], value[2], value[3]));
        }

        this.storage.set(address, storage);
    }

    public evaluate(contract: BTCContract, owner: Address, sender: Address, calldata: DataView): EvaluatedResult {
        this.reset();

        return {
            slots: this.requiredStorage,
            gas: 0,
        };
    }

    public execute(contract: BTCContract, sender: Address, calldata: DataView, slots: BlockchainStorage): DataView {
        this.reset();

        return new DataView(new ArrayBuffer(0));
    }
}
