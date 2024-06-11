import { Address } from '../btc/types/Address';
import { u256 } from 'as-bignum/assembly';
import { StackingOP0 } from './StackingOP0';

@final
export class wBTC extends StackingOP0 {
    public readonly decimals: u8 = 8;

    public readonly name: string = 'Wrapped Bitcoin';
    public readonly symbol: string = 'wBTC';

    constructor(self: Address, owner: Address) {
        const bytes: u8[] = [74, 155, 99, 132, 72, 128, 0];

        super(self, owner, u256.fromBytes(bytes));
    }
}
