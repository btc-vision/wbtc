import { MotoSwapFactory } from './MotoSwapFactory';
import { Blockchain } from './btc/env';
import { Address } from './btc/types/Address';

export function CONTRACT(owner: Address, self: Address): MotoSwapFactory {
    const blockchainData = Blockchain.init(owner, self);

    return new MotoSwapFactory(blockchainData.selfAddress, blockchainData.ownerAddress);
}
