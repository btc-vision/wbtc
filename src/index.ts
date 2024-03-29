import { Blockchain } from './btc/env';
import { Address } from './btc/types/Address';
import { BTCContract } from './btc/contracts/BTCContract';
import { Moto } from '../contracts/Moto';

export function CONTRACT(owner: Address, self: Address): BTCContract {
    const blockchainData = Blockchain.init(owner, self);

    const contract = new Moto(blockchainData.selfAddress, blockchainData.ownerAddress);
    Blockchain.setContract(blockchainData.selfAddress, contract);

    return contract;
}

export * from './btc/exports';
