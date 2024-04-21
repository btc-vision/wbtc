import { OP_NET } from '../contracts/OP_NET';
import { encodeSelector, Selector } from '../math/abi';
import { BytesReader } from '../buffer/BytesReader';
import { BytesWriter } from '../buffer/BytesWriter';

export type ABIRegistryItem = Uint8Array;

export type Calldata = NonNullable<BytesReader>;

export type ContractABIMap = Set<Selector>;
export type PropertyABIMap = Set<ABIRegistryItem>;

export type SelectorsMap = Map<OP_NET, PropertyABIMap>;
export type MethodMap = Map<OP_NET, ContractABIMap>;

export type ViewSelectorsMap = Map<OP_NET, Set<Selector>>;

class ABIRegistryBase {
    private methodMap: MethodMap = new Map();
    private selectors: SelectorsMap = new Map();

    private viewSelectors: ViewSelectorsMap = new Map();
    private allowedWriteMethods: ViewSelectorsMap = new Map();

    // Register properties with their selectors and handlers
    public defineGetterSelector(contract: OP_NET, name: string, canWrite: boolean): void {
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

        let viewSelectorMap: Set<Selector>;
        if (!this.viewSelectors.has(contract)) {
            viewSelectorMap = new Set();
        } else {
            viewSelectorMap = this.viewSelectors.get(contract);
        }

        if (canWrite) this.addToWriteMethods(contract, selector);

        if (!viewSelectorMap.has(selector)) {
            viewSelectorMap.add(selector);

            this.viewSelectors.set(contract, viewSelectorMap);
        }

        this.selectors.set(contract, contractMap);
    }

    public hasSelectorForView(selector: Selector, contract: OP_NET | null = null): OP_NET | null {
        if (contract === null) {
            return this.hasViewSelectorInAllContracts(selector);
        }

        return this.hasViewForContract(contract, selector);
    }

    public hasViewSelectorInAllContracts(selector: Selector): OP_NET | null {
        const keys = this.viewSelectors.keys();
        const values = this.viewSelectors.values();

        for (let i: i32 = 0; i < values.length; i++) {
            const contract = keys[i];
            if (!contract) {
                continue;
            }

            const contractMap = values[i];
            if (contractMap.has(selector)) {
                return contract;
            }
        }

        throw new Error(`Selector ${selector} not found.`);
    }

    public hasViewForContract(contract: OP_NET, selector: Selector): OP_NET | null {
        if (!this.viewSelectors.has(contract)) {
            throw new Error(`Contract not found.`);
        }

        const contractMap = this.viewSelectors.get(contract);
        if (!contractMap) {
            throw new Error(`Contract not found.`);
        }

        if (contractMap.has(selector)) {
            return contract;
        }

        return null;
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

    public getWriteMethods(): Uint8Array {
        const writer: BytesWriter = new BytesWriter();
        writer.writeMethodSelectorsMap(this.allowedWriteMethods);

        return writer.getBuffer();
    }

    // Register methods with their selectors and handlers
    public defineMethodSelector(contract: OP_NET, name: string, canWrite: boolean): void {
        const selector: u32 = encodeSelector(name);

        if (!this.methodMap.has(contract)) {
            this.methodMap.set(contract, new Set());
        }

        if (canWrite) this.addToWriteMethods(contract, selector);

        const contractMap: ContractABIMap = this.methodMap.get(contract);
        if (contractMap.has(selector)) {
            throw new Error(`Method ${name} already exists.`);
        }

        contractMap.add(selector);

        this.methodMap.set(contract, contractMap);
    }

    public hasMethodByContract(contract: OP_NET, selector: Selector): OP_NET | null {
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
    public hasMethodBySelector(selector: Selector, contract: OP_NET | null): OP_NET | null {
        if (!contract) {
            return this.hasMethodBySelectorInAllContracts(selector);
        }

        return this.hasMethodByContract(contract, selector);
    }

    private addToWriteMethods(contract: OP_NET, selector: Selector): void {
        let writeSelectorMap: Set<Selector>;
        if (!this.allowedWriteMethods.has(contract)) {
            writeSelectorMap = new Set();
        } else {
            writeSelectorMap = this.allowedWriteMethods.get(contract);
        }

        if (!writeSelectorMap.has(selector)) {
            writeSelectorMap.add(selector);

            this.allowedWriteMethods.set(contract, writeSelectorMap);
        }
    }

    private hasMethodBySelectorInAllContracts(selector: Selector): OP_NET | null {
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
