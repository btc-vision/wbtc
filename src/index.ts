import { Blockchain } from './btc/env';
import { OP_NET } from './btc/contracts/OP_NET';
import { wBTC } from './contract/WBTC';

export function getContract(): OP_NET {
    Blockchain.requireInitialization();

    const defaults = Blockchain.getDefaults();
    const contract = new wBTC(defaults.selfAddress, defaults.ownerAddress);

    Blockchain.setContract(defaults.selfAddress, contract);

    return contract;
}


export * from './btc/exports';
