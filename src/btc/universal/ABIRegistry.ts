import { BTCContract } from '../contracts/BTCContract';

export type Pointer = u32;
export type ContractFunction = (parameters: Pointer) => Pointer;
export type ContractABIMap = Map<string, ContractFunction>;

class ABIRegistryBase {
    private methodMap: Map<BTCContract, ContractABIMap> = new Map();
    private propertyMap: Map<BTCContract, Set<string>> = new Map();

    // Register properties with their names and handlers
    public registerProperty(contract: BTCContract, name: string): void {
        const contractMap = this.propertyMap.get(contract) || new Map();
        contractMap.add(name);

        this.propertyMap.set(contract, contractMap);
    }

    public listProperties(contract: BTCContract): string[] {
        const contractMap = this.propertyMap.get(contract);
        if (!contractMap) {
            return [];
        }

        return contractMap.values();
    }

    // Register methods with their names and handlers
    public registerMethod(contract: BTCContract, name: string, handler: ContractFunction): void {
        const contractMap = this.methodMap.get(contract) || new Map();
        contractMap.set(name, handler);

        this.methodMap.set(contract, contractMap);
    }

    public getMethodByContract(contract: BTCContract, name: string): ContractFunction {
        const contractMap = this.methodMap.get(contract);
        if (!contractMap) {
            throw new Error(`Contract not found.`);
        }

        const handler = contractMap.get(name);
        if (!handler) {
            throw new Error(`Method ${name} not found in contract.`);
        }

        return handler;
    }

    // Call a method by name
    public callMethodByName(name: string, contract: BTCContract | null): ContractFunction {
        if (!contract) {
            return this.getMethodByName(name);
        }

        return this.getMethodByContract(contract, name);
    }

    // List all registered method names
    public listMethods(contract: BTCContract): string[] {
        const contractMap = this.methodMap.get(contract);
        if (!contractMap) {
            return [];
        }

        return contractMap.keys();
    }

    public listAllMethods(): string[] {
        const values = this.methodMap.values();
        const result = new Array<string>();

        for (let i: u32 = 0; i < values.length; i++) {
            const contractMap = values[i];
            const keys = contractMap.keys();

            for (let j: u32 = 0; j < keys.length; j++) {
                result.push(keys[j]);
            }
        }

        return result;
    }

    private getMethodByName(name: string): ContractFunction {
        const values = this.methodMap.values();

        for (let i: u32 = 0; i < values.length; i++) {
            const contractMap = values[i];
            const handler = contractMap.get(name);

            if (handler) {
                return handler;
            }
        }

        throw new Error(`Method ${name} not found.`);
    }
}

export const ABIRegistry = new ABIRegistryBase;
