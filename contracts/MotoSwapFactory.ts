import { BTCContract } from '../src/btc/contracts/BTCContract';
import { Address } from '../src/btc/types/Address';
import { consoleLog } from '../src/btc/env';

export class MotoSwapFactory extends BTCContract {

    constructor(self: Address, owner: Address) {
        super(self, owner);

        consoleLog(`Contract: ${self} Owner: ${owner}`);
    }

    public defineSelectors(): void {
        // Define selectors here
    }
}
