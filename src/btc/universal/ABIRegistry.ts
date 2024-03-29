import { BTCContract } from '../contracts/BTCContract';
import { encodeSelector, Selector } from '../math/abi';
import { BytesReader } from '../buffer/BytesReader';
import { BytesWriter } from '../buffer/BytesWriter';

export type ABIRegistryItem = Uint8Array;

export type Calldata = NonNullable<BytesReader>;
//export type ContractFunction = (calldata: Calldata, caller?: PotentialAddress) => BytesWriter;

export type ContractABIMap = Set<Selector>;
export type PropertyABIMap = Set<ABIRegistryItem>;

export type SelectorsMap = Map<BTCContract, PropertyABIMap>;
export type MethodMap = Map<BTCContract, ContractABIMap>;

class ABIRegistryBase {
    private methodMap: MethodMap = new Map();
    private selectors: SelectorsMap = new Map();

    // Register properties with their selectors and handlers
    public defineGetterSelector(contract: BTCContract, name: string): void {
        const selector: Selector = encodeSelector(name);

        let contractMap: PropertyABIMap;
        if (!this.selectors.has(contract)) {
            contractMap = new Set();
        } else {
            contractMap = this.selectors.get(contract);
        }

        const selectorWriter: BytesWriter = new BytesWriter();
        selectorWriter.writeABISelector(name, selector);

        contractMap.add(selectorWriter.getBuffer());

        this.selectors.set(contract, contractMap);
    }

    public getSelectorForContract(contract: BTCContract): ABIRegistryItem {
        if (!this.selectors.has(contract)) {
            throw new Error(`Contract not found.`);
        }

        const contractMap: PropertyABIMap = this.selectors.get(contract);
        if (!contractMap) {
            throw new Error(`Contract not found.`);
        }

        return contractMap.values()[0];
    }

    public getViewSelectors(): Uint8Array {
        const writer: BytesWriter = new BytesWriter();
        writer.writeViewSelectorMap(this.selectors);

        return writer.getBuffer();
    }

    public getMethodSelectors(): Uint8Array {
        const writer: BytesWriter = new BytesWriter();
        writer.writeMethodSelectorsMap(this.methodMap);

        return writer.getBuffer();
    }

    // Register methods with their selectors and handlers
    public defineMethodSelector(contract: BTCContract, name: string): void {
        const selector: u32 = encodeSelector(name);

        if (!this.methodMap.has(contract)) {
            this.methodMap.set(contract, new Set());
        }

        const contractMap: ContractABIMap = this.methodMap.get(contract);
        if (contractMap.has(selector)) {
            throw new Error(`Method ${name} already exists.`);
        }

        contractMap.add(selector);

        this.methodMap.set(contract, contractMap);
    }

    public hasMethodByContract(contract: BTCContract, selector: Selector): BTCContract | null {
        if (!this.methodMap.has(contract)) {
            throw new Error(`Contract not found.`);
        }

        const contractMap = this.methodMap.get(contract);

        if (contractMap.has(selector)) {
            return contract;
        }

        return null;
    }

    // Call a method by selector
    public hasMethodBySelector(selector: Selector, contract: BTCContract | null): BTCContract | null {
        if (!contract) {
            return this.hasMethodBySelectorInAllContracts(selector);
        }

        return this.hasMethodByContract(contract, selector);
    }

    public hasMethodByName(name: string, contract: BTCContract | null): BTCContract | null {
        const selector: Selector = encodeSelector(name);

        return this.hasMethodBySelector(selector, contract);
    }

    private hasMethodBySelectorInAllContracts(selector: Selector): BTCContract | null {
        const keys = this.methodMap.keys();
        const values = this.methodMap.values();

        for (let i: i32 = 0; i < values.length; i++) {
            const contract = keys[i];
            if (!contract) {
                continue;
            }

            const contractMap = values[i];
            const handler = contractMap.add(selector);

            if (handler) {
                return contract;
            }
        }

        throw new Error(`Selector ${selector} not found.`);
    }
}

export const ABIRegistry = new ABIRegistryBase;
