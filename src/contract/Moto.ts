import { Address, PotentialAddress } from '../btc/types/Address';
import { OP_20 } from '../btc/contracts/OP_20';
import { Calldata } from '../btc/universal/ABIRegistry';
import { BytesWriter } from '../btc/buffer/BytesWriter';
import { u256 } from 'as-bignum/assembly';
import { encodeSelector, Selector } from '../btc/math/abi';
import { SafeMath } from '../btc/types/SafeMath';

@final
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
            case encodeSelector('testMethodMultipleAddresses'):
                return this.testMethodMultipleAddresses(calldata);
        }

        return super.callMethod(method, calldata, _caller);
    }

    public testMethodMultipleAddresses(callData: Calldata): BytesWriter {
        const addressA: Address = callData.readAddress();
        const addressB: Address = callData.readAddress();

        const resp = this._testMethodMultipleAddresses(addressA, addressB);
        this.response.writeTuple(resp);

        return this.response;
    }

    public defineSelectors(): void {
        super.defineSelectors();

        this.defineMethodSelector('addFreeMoney', true);
        this.defineMethodSelector('testMethodMultipleAddresses', false);
    }

    protected _testMethodMultipleAddresses(addressA: Address, addressB: Address): u256[] {
        const balanceA: u256 = this._balanceOf(addressA);
        const balanceB: u256 = this._balanceOf(addressB);

        const balanceAMinusBalanceB: u256 = SafeMath.sub(balanceA, balanceB);
        const totalSupplyMinusTwo: u256 = SafeMath.sub(this.totalSupply, u256.fromU32(2));

        return [balanceA, balanceB, balanceAMinusBalanceB, totalSupplyMinusTwo];
    }

    protected _addFreeMoney(owner: string, value: u256, _caller: Address): void {
        const balance: u256 = this.balanceOfMap.get(owner);
        //console.log(`Balance of ${owner}: ${balance}`);

        const newBalance: u256 = SafeMath.add(balance, value);
        this.balanceOfMap.set(owner, newBalance);

        //const newBalanceAfter: u256 = this.balanceOfMap.get(owner);
        //console.log(`Balance of ${owner} is now: ${newBalanceAfter} - ${newBalance}`);

        //console.log(`Total supply before adding ${value} to ${owner}: ${this.totalSupply}`);

        // @ts-ignore
        this._totalSupply += value;

        //console.log(`Total supply is now: ${this.totalSupply}, added ${value} to ${owner}`);
    }
}
