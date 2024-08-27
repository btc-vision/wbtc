import { ABIRegistry, Blockchain } from '@btc-vision/btc-runtime/runtime';
import { wBTC } from './contracts/WBTC';

export function defineSelectors(): void {
    // OP_NET
    ABIRegistry.defineGetterSelector('address', false);
    ABIRegistry.defineGetterSelector('owner', false);
    ABIRegistry.defineMethodSelector('isAddressOwner', false);

    // OP_20
    ABIRegistry.defineMethodSelector('allowance', false);
    ABIRegistry.defineMethodSelector('approve', true);
    ABIRegistry.defineMethodSelector('balanceOf', false);
    ABIRegistry.defineMethodSelector('burn', true);
    ABIRegistry.defineMethodSelector('mint', true);
    ABIRegistry.defineMethodSelector('transfer', true);
    ABIRegistry.defineMethodSelector('transferFrom', true);

    ABIRegistry.defineGetterSelector('decimals', false);
    ABIRegistry.defineGetterSelector('name', false);
    ABIRegistry.defineGetterSelector('symbol', false);
    ABIRegistry.defineGetterSelector('totalSupply', false);
    ABIRegistry.defineGetterSelector('maxSupply', false);

    // STAKING
    ABIRegistry.defineMethodSelector('stake', true);
    ABIRegistry.defineMethodSelector('unstake', true);
    ABIRegistry.defineMethodSelector('stakedAmount', false);
    ABIRegistry.defineMethodSelector('stakedReward', false);
    ABIRegistry.defineMethodSelector('claim', true);

    ABIRegistry.defineGetterSelector('rewardPool', false);
    ABIRegistry.defineGetterSelector('totalStaked', false);
    ABIRegistry.defineMethodSelector('stakedAt', false);

    /** WBTC */
    ABIRegistry.defineMethodSelector('requestWithdrawal', true);
    ABIRegistry.defineMethodSelector('withdrawableBalanceOf', false);
}

Blockchain.contract = () => {
    const contract = new wBTC();
    contract.onInstantiated();

    return contract;
};

// VERY IMPORTANT
export * from '@btc-vision/btc-runtime/runtime/exports';
