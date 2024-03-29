import { MotoSwapFactory } from './MotoSwapFactory';
import { Blockchain } from './btc/env';
import { Address } from './btc/types/Address';
import { ABIRegistry, Pointer } from './btc/universal/ABIRegistry';

let contract: MotoSwapFactory | null = null;

export function CONTRACT(owner: Address, self: Address): MotoSwapFactory {
    const blockchainData = Blockchain.init(owner, self);

    const contract = new MotoSwapFactory(blockchainData.selfAddress, blockchainData.ownerAddress);
    Blockchain.setContract(blockchainData.selfAddress, contract);

    return contract;
}

export function getIsAddressOwner(): (this: MotoSwapFactory, self: string) => boolean {
    if (!contract) {
        throw new Error('Contract not initialized');
    }

    return contract.isAddressOwner;
}

export function read(method: string, dataPointer: Pointer): Pointer {
    if (!contract) {
        throw new Error('Contract not initialized');
    }

    if (!(method in contract)) {
        throw new Error(`Method ${method} not found`);
    }

    const methodToCall = ABIRegistry.callMethodByName(method, null);

    return methodToCall(dataPointer);
}

export function listMethods(): string[] {
    if (!contract) {
        throw new Error('Contract not initialized');
    }

    return Blockchain.getContractABI();
}

/*export function getInternalReferences(): () => u64[] {
    const internalReferences = new Array<u64>();

    contract.map<string, u64>('internalReferences', (key: string, value: u64) => {
        internalReferences.push(value);
    });
}*/

/*export function executeRead(name: keyof MotoSwapFactory): boolean {
    if (!contract) {
        throw new Error('Contract not initialized');
    }

    return contract[name]();
}*/
