import { MotoSwapFactory } from './MotoSwapFactory';
import { Blockchain } from './btc/env';

export function CONTRACT(): MotoSwapFactory {
    const blockchainData = Blockchain.init();

    return new MotoSwapFactory(blockchainData.self, blockchainData.owner);
}
