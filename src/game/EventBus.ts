type Handler = (payload: unknown) => void;

class EventBusClass {
  private listeners: Map<string, Handler[]> = new Map();

  on(event: string, handler: Handler): () => void {
    const list = this.listeners.get(event) ?? [];
    list.push(handler);
    this.listeners.set(event, list);
    return () => {
      const arr = this.listeners.get(event) ?? [];
      const i = arr.indexOf(handler);
      if (i >= 0) arr.splice(i, 1);
    };
  }

  emit(event: string, payload?: unknown): void {
    (this.listeners.get(event) ?? []).forEach((h) => h(payload));
  }
}

export const EventBus = new EventBusClass();
