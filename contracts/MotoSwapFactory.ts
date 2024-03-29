import { BTCContract } from '../src/btc/contracts/BTCContract';
import { Address } from '../src/btc/types/Address';

export class MotoSwapFactory extends BTCContract {

    constructor(self: Address, owner: Address) {
        super(self, owner);
    }

    public defineSelectors(): void {
        // Define selectors here
    }
}
