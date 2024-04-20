import { Address, PotentialAddress } from '../btc/types/Address';
import { OP_20 } from '../btc/contracts/OP_20';
import { Calldata } from '../btc/universal/ABIRegistry';
import { BytesWriter } from '../btc/buffer/BytesWriter';
import { u256 } from 'as-bignum/assembly';
import { encodeSelector, Selector } from '../btc/math/abi';
import { SafeMath } from '../btc/types/SafeMath';
import { StoredU256 } from '../btc/storage/StoredU256';

export class Moto extends OP_20 {
    public readonly decimals: u8 = 8;

    public readonly name: string = 'Motoswap';
    public readonly symbol: string = 'MOTO';

    constructor(self: Address, owner: Address) {
        super(self, owner);
    }

    public addFreeMoney(callData: Calldata, caller: Address): BytesWriter {
        const owner: Address = callData.readAddress();
        const value: u256 = callData.readU256();

        this._addFreeMoney(owner, value, caller);

        this.response.writeBoolean(true);

        return this.response;
    }

    public callMethod(method: Selector, calldata: Calldata, _caller: PotentialAddress = null): BytesWriter {
        switch (method) {
            case encodeSelector('addFreeMoney'):
                return this.addFreeMoney(calldata, _caller as Address);
        }

        return super.callMethod(method, calldata, _caller);
    }

    public defineSelectors(): void {
        super.defineSelectors();

        this.defineMethodSelector('addFreeMoney', true);
    }

    protected _addFreeMoney(owner: string, value: u256, _caller: Address): void {
        const balance: u256 = this.balanceOfMap.get(owner);
        const newBalance: u256 = SafeMath.add(balance, value);

        this.balanceOfMap.set(owner, newBalance);
        this._totalSupply = StoredU256.add(this._totalSupply, value);
    }
}
