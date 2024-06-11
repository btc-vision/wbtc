import { Address } from '../btc/types/Address';
import { OP_0 } from '../btc/contracts/OP_0';
import { Calldata } from '../btc/universal/ABIRegistry';
import { BytesWriter } from '../btc/buffer/BytesWriter';
import { Selector } from '../btc/math/abi';
import { u256 } from 'as-bignum/assembly';

@final
export class wBTC extends OP_0 {
    public readonly decimals: u8 = 8;

    public readonly name: string = 'Wrapped Bitcoin';
    public readonly symbol: string = 'wBTC';

    constructor(self: Address, owner: Address) {
        super(self, owner, u256.fromBytes([74, 155, 99, 132, 72, 128, 0]));
    }

    public callMethod(method: Selector, calldata: Calldata): BytesWriter {
        return super.callMethod(method, calldata);
    }

    public defineSelectors(): void {
        super.defineSelectors();
    }
}
