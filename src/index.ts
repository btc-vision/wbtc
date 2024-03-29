import { MotoSwapFactory } from '../contracts/MotoSwapFactory';
import { Blockchain } from './btc/env';
import { Address } from './btc/types/Address';

export function CONTRACT(owner: Address, self: Address): MotoSwapFactory {
    const blockchainData = Blockchain.init(owner, self);

    const contract = new MotoSwapFactory(blockchainData.selfAddress, blockchainData.ownerAddress);
    Blockchain.setContract(blockchainData.selfAddress, contract);

    return contract;
}

export * from './btc/exports';
