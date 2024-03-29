import { IBTC } from '../interfaces/IBTC';
import { Address, PotentialAddress } from '../types/Address';
import { Blockchain } from '../env';
import { ABIRegistry, Calldata } from '../universal/ABIRegistry';
import { BytesWriter } from '../buffer/BytesWriter';
import { encodeSelector, Selector } from '../math/abi';

export abstract class BTCContract implements IBTC {
    public readonly response: BytesWriter = new BytesWriter();

    private readonly _owner: string;
    private readonly _self: string;

    protected constructor(self: Address, owner: Address) {
        if (!self) {
            throw new Error('CONTRACT DOESNT NOT KNOW ITS OWN ADDRESS.');
        }

        if (!owner) {
            throw new Error('NO CONTRACT INITIALIZER FOUND.');
        }

        if (Blockchain.hasContract(self)) {
            throw new Error('CONTRACT ALREADY EXISTS.');
        }

        //memory.grow(1); // 64k allocate memory for the contract

        this._owner = owner;
        this._self = self;

        if (!this._owner) {
            throw new Error('Owner is required');
        }

        if (!this._self) {
            throw new Error('Self is required');
        }

        this.defineProtectedSelectors();
    }

    public get self(): string {
        return this._self;
    }

    public get owner(): string {
        return this._owner;
    }

    public defineGetterSelector(name: string): void {
        ABIRegistry.defineGetterSelector(this, name);
    }

    public abstract defineSelectors(): void;

    public callMethod(method: Selector, calldata: Calldata, _caller: PotentialAddress = null): BytesWriter {
        switch (method) {
            case encodeSelector('isAddressOwner'):
                return this.isAddressOwner(calldata);
            default:
                throw new Error('Method not found');
        }
    }

    protected isSelf(address: Address): boolean {
        return this._self === address;
    }

    protected defineMethodSelector(name: string): void {
        ABIRegistry.defineMethodSelector(this, name);
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
        this.defineGetterSelector('self');
        this.defineGetterSelector('owner');
        this.defineMethodSelector('isAddressOwner');

        this.defineSelectors();
    }
}
