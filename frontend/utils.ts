import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";

export const getAudioDataURI = (audioBuffer: string) => {
    return `data:audio/mp3;base64,${audioBuffer}`;
};
export const getImageDataURI = (audioBuffer: string) => {
    return `data:image/jpg;base64,${audioBuffer}`;
};

export const setData = async (key: string, value: any) => {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        // saving error
    }
};

export const getData = async (key: string) => {
    try {
        const value = await AsyncStorage.getItem(key);
        if (value !== null) {
            return JSON.parse(value);
        } else {
            return null;
        }
    } catch (e) {
        // error reading value
    }
};

export const speakAudio = (text: string, opts?: any) => {
    Speech.speak(text, {
        onStart: () => {
            console.log("onStart");
            opts?.onStart?.();
        },

        onStopped: () => {
            console.log("onStopped");
            opts?.onStopped?.();
        },
        onDone: () => {
            console.log("onDone");
            opts?.onStopped?.();
        },

        rate: 1.25,
        ...opts,
    });
};

export const stopAudio = () => {
    Speech.stop();
};

export const SCENE_DESCRIBE_API =
    "https://simply-expert-possum.ngrok-free.app/scene-caption";
export const ASR_URL = "https://fowl-chief-shrimp.ngrok-free.app/asr";

export const UPLOAD_URL = "https://simply-expert-possum.ngrok-free.app/upload";
