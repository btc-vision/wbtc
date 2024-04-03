import { Blockchain } from './btc/env';
import { BTCContract } from './btc/contracts/BTCContract';
import { Moto } from '../contracts/Moto';

export function getContract(): BTCContract {
    Blockchain.requireInitialization();

    const defaults = Blockchain.getDefaults();
    const contract = new Moto(defaults.selfAddress, defaults.ownerAddress);

    Blockchain.setContract(defaults.selfAddress, contract);
    Blockchain.growMemory(1); // 64k allocate memory for the contract

    return contract;
}


export * from './btc/exports';
