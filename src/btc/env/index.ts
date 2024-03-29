import { BlockchainEnvironment } from './BTCEnvironment';

// @ts-ignore
@external('env', 'console.log')
export declare function consoleLog(s: string): void

if (!consoleLog) {
    throw new Error('NO CONSOLE LOG FOUND.');
}

export const Blockchain: BlockchainEnvironment = new BlockchainEnvironment();
