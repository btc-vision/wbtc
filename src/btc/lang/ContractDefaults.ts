import { Address } from '../types/Address';
import { Potential } from './Definitions';


export class ContractDefaults {
    public owner: Potential<Address> = null;
    public self: Potential<Address> = null;

    public loaded: boolean = false;

    constructor() {
    }


    get selfAddress(): Address {
        if (!this.self) throw new Error('Self address not found');

        return this.self as Address;
    }

    get ownerAddress(): Address {
        if (!this.owner) throw new Error('Owner address not found');

        return this.owner as Address;
    }

    public loadContractDefaults(owner: Address, self: Address): void {
        if (this.loaded) throw new Error('Defaults already loaded');

        this.owner = owner; //
        this.self = self; //memoryReader.readStringFromMemory(62);

        if (!this.self) {
            throw new Error('NO CONTRACT INITIALIZER FOUND.');
        }

        if (!this.owner) {
            throw new Error('NO CONTRACT OWNER FOUND.');
        }
    }
}
