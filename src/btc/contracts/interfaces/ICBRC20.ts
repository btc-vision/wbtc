import { u256 } from 'as-bignum/assembly';
import { PotentialAddress } from '../../types/Address';
import { BytesWriter } from '../../buffer/BytesWriter';
import { Calldata } from '../../universal/ABIRegistry';

export interface ICBRC20 {
    readonly name: string;
    readonly symbol: string;

    readonly decimals: u8;
    readonly _totalSupply: u256;

    balanceOf(callData: Calldata, caller?: PotentialAddress): BytesWriter;

    transfer(callData: Calldata, caller: PotentialAddress): BytesWriter;

    transferFrom(callData: Calldata, caller: PotentialAddress): BytesWriter;

    approve(callData: Calldata, caller: PotentialAddress): BytesWriter;

    allowance(callData: Calldata, caller?: PotentialAddress): BytesWriter;

    burn(callData: Calldata, caller: PotentialAddress): BytesWriter;

    mint(callData: Calldata, caller: PotentialAddress): BytesWriter;
}
