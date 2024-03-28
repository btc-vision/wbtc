import { IBTC } from '../interfaces/IBTC';
import { Address } from '../types/Address';

export abstract class BTCContract implements IBTC {
    private readonly _owner: string;
    private readonly _self: string;

    protected constructor(self: Address, owner: Address) {
        if (!self) {
            throw new Error('CONTRACT DOESNT NOT KNOW ITS OWN ADDRESS.');
        }

        if (!owner) {
            throw new Error('NO CONTRACT INITIALIZER FOUND.');
        }

        memory.grow(1); // 64k allocate memory for the contract

        this._owner = owner;
        this._self = self;

        if (!this._owner) {
            throw new Error('Owner is required');
        }

        if (!this._self) {
            throw new Error('Self is required');
        }
    }

    public get self(): string {
        return this._self;
    }

    public get owner(): string {
        return this._owner;
    }
}
