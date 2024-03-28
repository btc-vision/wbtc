import { BlockchainEnvironment } from './BTCEnvironment';
import { Address } from '../types/Address';

// @ts-ignore
@external('env', 'console.log')
export declare function consoleLog(s: string): void

if (!consoleLog) {
    throw new Error('NO CONSOLE LOG FOUND.');
}

export const self: Address = ''; //memoryReader.readStringFromMemory(62);

consoleLog(`Contract: ${self}`);

export const owner: Address = ''; //memoryReader.readStringFromMemory(62);

if (!self) {
    throw new Error('NO CONTRACT INITIALIZER FOUND.');
}

if (!owner) {
    throw new Error('NO CONTRACT OWNER FOUND.');
}

export const Blockchain: BlockchainEnvironment = new BlockchainEnvironment();
