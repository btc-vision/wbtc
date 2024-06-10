import { Address, PotentialAddress } from '../btc/types/Address';
import { OP_0 } from '../btc/contracts/OP_0';
import { Calldata } from '../btc/universal/ABIRegistry';
import { BytesWriter } from '../btc/buffer/BytesWriter';
import { Selector } from '../btc/math/abi';
import { IOP_0 } from '../btc/contracts/interfaces/IOP_0';

@final
export class wBTC extends OP_0 {
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


@final
export class ExampleCoin extends OP_0 implements IOP_0 {
    public readonly decimals: u8 = 18;

    public readonly name: string = 'Example Coin';
    public readonly symbol: string = 'XCOIN';

    constructor(self: Address, owner: Address) {
        super(self, owner);
    }

    public callMethod(method: Selector, calldata: Calldata, _caller: PotentialAddress = null): BytesWriter {
        switch (method) {
            default: {
                return super.callMethod(method, calldata, _caller);
            }
        }
    }

    public defineSelectors(): void {
        super.defineSelectors();
    }
}
