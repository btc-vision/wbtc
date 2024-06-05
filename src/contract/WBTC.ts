import { Address, PotentialAddress } from '../btc/types/Address';
import { OP_20 } from '../btc/contracts/OP_20';
import { Calldata } from '../btc/universal/ABIRegistry';
import { BytesWriter } from '../btc/buffer/BytesWriter';
import { Selector } from '../btc/math/abi';

@final
export class wBTC extends OP_20 {
    public readonly decimals: u8 = 8;

    public readonly name: string = 'Wrapped Bitcoin';
    public readonly symbol: string = 'wBTC';

    constructor(self: Address, owner: Address) {
        super(self, owner);
    }

    public callMethod(method: Selector, calldata: Calldata, _caller: PotentialAddress = null): BytesWriter {
        return super.callMethod(method, calldata, _caller);
    }

    public defineSelectors(): void {
        super.defineSelectors();
    }
}
