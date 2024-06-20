import { Address } from '../types/Address';
import { Potential } from './Definitions';

export class ContractDefaults {
    public owner: Potential<Address> = null;
    public contractAddress: Potential<Address> = null;

    public loaded: boolean = false;

    constructor() {
    }

    public get selfAddress(): Address {
        if (!this.contractAddress) throw new Error('Self address not found');

        return this.contractAddress as Address;
    }

    public get ownerAddress(): Address {
        if (!this.owner) throw new Error('Owner address not found');

        return this.owner as Address;
    }

    public loadContractDefaults(owner: Address, contractAddress: Address): void {
        if (this.loaded) throw new Error('Defaults already loaded');

        this.owner = owner; //
        this.contractAddress = contractAddress; //memoryReader.readStringFromMemory(62);

        if (!this.contractAddress) {
            throw new Error('NO CONTRACT INITIALIZER FOUND.');
        }

        if (!this.owner) {
            throw new Error('NO CONTRACT OWNER FOUND.');
        }
    }
}
