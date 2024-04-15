import { IBTC } from '../interfaces/IBTC';
import { Address, PotentialAddress } from '../types/Address';
import { Blockchain } from '../env';
import { ABIRegistry, Calldata } from '../universal/ABIRegistry';
import { BytesWriter } from '../buffer/BytesWriter';
import { encodeSelector, Selector } from '../math/abi';
import { Revert } from '../types/Revert';

export abstract class BTCContract implements IBTC {
    public readonly response: BytesWriter = new BytesWriter();

    private readonly _owner: string;
    private readonly _address: string;

    protected constructor(contractAddress: Address, owner: Address) {
        if (!contractAddress) {
            throw new Revert('CONTRACT DOESNT NOT KNOW ITS OWN ADDRESS.');
        }

        if (!owner) {
            throw new Revert('NO CONTRACT INITIALIZER FOUND.');
        }

        if (Blockchain.hasContract(contractAddress)) {
            throw new Revert('CONTRACT ALREADY EXISTS.');
        }

        //memory.grow(1); // 64k allocate memory for the contract

        this._owner = owner;
        this._address = contractAddress;

        if (!this._owner) {
            throw new Revert('Owner is required');
        }

        if (!this._address) {
            throw new Revert('Self is required');
        }

        this.defineProtectedSelectors();
    }

    public get address(): string {
        return this._address;
    }

    public get owner(): string {
        return this._owner;
    }

    public abstract defineSelectors(): void;

    public callMethod(method: Selector, calldata: Calldata, _caller: PotentialAddress = null): BytesWriter {
        switch (method) {
            case encodeSelector('isAddressOwner'):
                return this.isAddressOwner(calldata);
            default:
                throw new Revert('Method not found');
        }
    }

    public callView(method: Selector): BytesWriter {
        switch (method) {
            case encodeSelector('address'):
                this.response.writeAddress(this.address);
                break;
            case encodeSelector('owner'):
                this.response.writeAddress(this.owner);
                break;
            default:
                throw new Revert('Method not found');
        }

        return this.response;
    }

    protected defineGetterSelector(name: string, canWrite: boolean): void {
        ABIRegistry.defineGetterSelector(this, name, canWrite);
    }

    protected isSelf(address: Address): boolean {
        return this._address === address;
    }

    protected onlyOwner(caller: Address): void {
        if (this._owner !== caller) {
            throw new Revert('Only owner can call this method');
        }
    }

    protected defineMethodSelector(name: string, canWrite: boolean): void {
        ABIRegistry.defineMethodSelector(this, name, canWrite);
    }

    protected call(contract: Address, method: Selector, calldata: Calldata): void {
        Blockchain.call(this, contract, method, calldata);
    }

    private isAddressOwner(calldata: Calldata): BytesWriter {
        const owner = calldata.readAddress();

        this.response.writeBoolean(this._owner === owner);

        return this.response;
    };

    private defineProtectedSelectors(): void {
        this.defineGetterSelector('address', false);
        this.defineGetterSelector('owner', false);
        this.defineMethodSelector('isAddressOwner', false);

        this.defineSelectors();
    }
}
