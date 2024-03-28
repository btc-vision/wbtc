import { MotoSwapFactory } from './MotoSwapFactory';
import { consoleLog, owner, self } from './btc/env';

consoleLog('MotoSwapFactory initialized.');

export const CONTRACT = new MotoSwapFactory(self, owner);
