import { create } from "zustand";

interface StoreState {
    base64: string;
    setBase64: (img: string) => void;
    getBase64: () => string;
    clearBase64: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
    base64: "",
    setBase64: (img) => set({ base64: img }),
    getBase64: () => get().base64,
    clearBase64: () => set({ base64: "" }),
}));
