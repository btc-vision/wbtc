import { CBRC20 } from '../src/btc/contracts/CBRC20';
import { Address } from '../src/btc/types/Address';

export class Moto extends CBRC20 {
    public readonly decimals: u8 = 18;

    public readonly name: string = 'Moto';
    public readonly symbol: string = 'MOTO';

    constructor(self: Address, owner: Address) {
        super(self, owner);
    }
}
