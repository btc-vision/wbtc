import { u256 } from 'as-bignum/assembly';
import { StackingOP20 } from './StackingOP20';

@final
export class wBTC extends StackingOP20 {
    public readonly decimals: u8 = 8;

    public readonly name: string = 'Wrapped Bitcoin';
    public readonly symbol: string = 'wBTC';

    constructor() {
        const bytes: u8[] = [74, 155, 99, 132, 72, 128, 0];

        super(u256.fromBytes(bytes));
    }
}
