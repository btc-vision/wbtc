import { BTCContract } from '../src/btc/contracts/BTCContract';
import { Address } from '../src/btc/types/Address';
import { CBRC20 } from '../src/btc/contracts/CBRC20';
import { Moto } from './Moto';

export class MotoSwapFactory extends BTCContract {
    private WBTCAddress: Address = ``;

    private WBTC: CBRC20;

    constructor(self: Address, owner: Address) {
        super(self, owner);

        this.WBTC = new Moto(this.WBTCAddress, owner);
    }

    public defineSelectors(): void {
        // Define selectors here
    }
}
