import { MotoSwapFactory } from './MotoSwapFactory';
import { Blockchain } from './btc/env';
import { Address } from './btc/types/Address';

let contract: MotoSwapFactory | null = null;

export function CONTRACT(owner: Address, self: Address): MotoSwapFactory {
    const blockchainData = Blockchain.init(owner, self);

    return new MotoSwapFactory(blockchainData.selfAddress, blockchainData.ownerAddress);
}

export function executeRead(name: keyof MotoSwapFactory): boolean {
    if (!contract) {
        throw new Error('Contract not initialized');
    }

    return contract[name]();
}
