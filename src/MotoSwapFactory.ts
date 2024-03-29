import { BTCContract } from './btc/contracts/BTCContract';
import { Address } from './btc/types/Address';
import { consoleLog } from './btc/env';

export class MotoSwapFactory extends BTCContract {

    constructor(self: Address, owner: Address) {
        super(self, owner);

        consoleLog(`Contract: ${self} Owner: ${owner}`);
    }

    public defineSelectors(): void {
        // Define selectors here
    }
}
