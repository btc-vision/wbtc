import { Blockchain } from './btc/env';
import { OP_NET } from './btc/contracts/OP_NET';
import { Moto } from './contract/Moto';

export function getContract(): OP_NET {
    Blockchain.requireInitialization();

    const defaults = Blockchain.getDefaults();
    const contract = new Moto(defaults.selfAddress, defaults.ownerAddress);

    Blockchain.setContract(defaults.selfAddress, contract);
    Blockchain.growMemory(1); // 64k allocate memory for the contract

    return contract;
}


export * from './btc/exports';
