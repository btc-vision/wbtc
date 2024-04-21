import { PotentialAddress } from '../../types/Address';
import { BytesWriter } from '../../buffer/BytesWriter';
import { Calldata } from '../../universal/ABIRegistry';
import { StoredU256 } from '../../storage/StoredU256';

export interface IOP_20 {
    readonly name: string;
    readonly symbol: string;

    readonly decimals: u8;
    readonly _totalSupply: StoredU256;

    balanceOf(callData: Calldata, caller?: PotentialAddress): BytesWriter;

    transfer(callData: Calldata, caller: PotentialAddress): BytesWriter;

    transferFrom(callData: Calldata, caller: PotentialAddress): BytesWriter;

    approve(callData: Calldata, caller: PotentialAddress): BytesWriter;

    allowance(callData: Calldata, caller?: PotentialAddress): BytesWriter;

    burn(callData: Calldata, caller: PotentialAddress): BytesWriter;

    mint(callData: Calldata, caller: PotentialAddress): BytesWriter;
}
