import { Address } from '../types/Address';
import { Potential } from './Definitions';
import { memoryReader } from '../buffer/MemoryReader';


export class ContractDefaults {
    public owner: Potential<Address> = null;
    public self: Potential<Address> = null;

    public loaded: boolean = false;

    constructor() {
    }


    public loadContractDefaults(): void {
        if (this.loaded) throw new Error('Defaults already loaded');

        this.owner = memoryReader.readStringFromMemory(62);
        this.self = memoryReader.readStringFromMemory(62);

        if (!this.self) {
            throw new Error('NO CONTRACT INITIALIZER FOUND.');
        }

        if (!this.owner) {
            throw new Error('NO CONTRACT OWNER FOUND.');
        }
    }
}
