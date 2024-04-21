export abstract class NetEvent {
    protected constructor(public eventType: string) {
    }

    public abstract getEventData(): Uint8Array;
}
