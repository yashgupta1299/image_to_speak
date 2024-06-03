import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
    ASR_URL,
    SCENE_DESCRIBE_API,
    getData,
    getImageDataURI,
    speakAudio,
    stopAudio,
} from "@/utils";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useStore } from "@/hooks/use-store";
import { Action, SCENE_LIST } from "@/constants";
import { Audio } from "expo-av";
import axios from "axios";
import {
    AndroidAudioEncoder,
    AndroidOutputFormat,
    IOSOutputFormat,
    Recording,
} from "expo-av/build/Audio";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";

export default function Index() {
    return (
        <View
            style={{
                flex: 1,
                justifyContent: "center",
            }}
        >
            <GestureHandlerRootView>
                <Output />
            </GestureHandlerRootView>
        </View>
    );
}

function Output({}) {
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const params = useLocalSearchParams<{ caption: string; imgUri: string }>();
    const [recording, setRecording] = useState<Recording | undefined>();

    const { getBase64 } = useStore();
    const timerRef = useRef<any>();

    const doubleTapGesture = Gesture.Tap()
        .maxDuration(250)
        .numberOfTaps(2)
        .onEnd(() => {
            timerRef.current = setTimeout(() => {
                // console.log("Double tap!");
                audioControl();
            }, 250);
        });

    const tripleTapGesture = Gesture.Tap()
        .maxDuration(250)
        .numberOfTaps(3)
        .onEnd(async () => {
            clearTimeout(timerRef.current);

            stopAudio();
            router.back();
        });

    useEffect(() => {
        speakAudio(params.caption, {
            rate: 1.1,
            onStart: () => setIsPlaying(true),
            onStopped: () => setIsPlaying(false),
        });
        setIsPlaying(true);
    }, []);

    const audioControl = async () => {
        isPlaying
            ? stopAudio()
            : speakAudio(params.caption, {
                  rate: 1.0,
                  onStart: () => setIsPlaying(true),
                  onStopped: () => setIsPlaying(false),
              });
    };

    async function onSceneDescribe() {
        console.log("DESCRIBE SCENE");
        const scenes = await getData(SCENE_LIST);
        if (!scenes || scenes?.length == 0) {
            console.log("No scenes available");
            // onCapture();
            speakAudio("No scenes available");
            return;
        }
        speakAudio("Please Wait");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        if (scenes.length == 1) {
            router.replace({
                pathname: "/output",
                params: { caption: scenes[0] },
            });
            return;
        }
        try {
            console.log("API CALLING");
            const resp = await axios.post(SCENE_DESCRIBE_API, {
                items: scenes,
            });

            const caption = resp.data["caption"];
            console.log("CAPTION", caption);
            router.replace({
                pathname: "/output",
                params: { caption: caption.replaceAll("*", "") },
            });
        } catch (e) {
            console.log("ERROR", e);
        }
    }

    async function startRecording() {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync({
                isMeteringEnabled: true,
                android: {
                    ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
                    extension: ".wav",
                    outputFormat: AndroidOutputFormat.DEFAULT,
                    audioEncoder: AndroidAudioEncoder.DEFAULT,
                },
                ios: {
                    ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
                    extension: ".wav",
                    outputFormat: IOSOutputFormat.LINEARPCM,
                },
                web: {
                    mimeType: "audio/wav",
                    bitsPerSecond: 128000,
                },
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

            setRecording(recording);
            console.log("Recording started");
            speakAudio("Speak");
        } catch (err) {
            console.error("Failed to start recording", err);
        }
    }

    async function stopRecording(send: boolean = true) {
        console.log("Stopping recording..");
        setRecording(undefined);
        await recording?.stopAndUnloadAsync();
        // const startTime = recordTimeRef.current;
        // const endTime = new Date();

        // const duration = endTime.getTime() - startTime?.getTime();
        // console.log("Duration", duration);
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
        });
        if (!send) {
            return null;
        }

        const uri = recording?.getURI();
        console.log("Recording stopped and stored at", uri);
        return uri;
    }

    const longPress = Gesture.LongPress()
        .minDuration(1000)
        .onStart((event) => {
            console.log("Long Press Begin");
            startRecording();
        })
        .onEnd(async (event, success) => {
            console.log("Long Press End", success);

            // console.log("Long Press End", success);
            const audioUri = await stopRecording(success);
            console.log("AUDIO URI", audioUri);
            if (!audioUri) {
                return;
            }

            FileSystem.uploadAsync(ASR_URL, audioUri, {
                fieldName: "file",
                mimeType: "audio/wav",
                httpMethod: "POST",
                headers: { "ngrok-skip-browser-warning": "NA" },
                uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            })
                .then(async (doc) => {
                    console.log("DOC BODY", doc.body);

                    const respBody = JSON.parse(doc.body);
                    console.log("RESPONSE", respBody);

                    switch (respBody["action"]) {
                        case Action.RESET:
                            router.back();
                            // onCapture();

                            break;
                        case Action.DESCRIBE:
                            onSceneDescribe();
                            break;
                        case Action.REPLAY:
                            speakAudio(params.caption, {
                                onStart: () => setIsPlaying(true),
                                onStopped: () => setIsPlaying(false),
                            });
                            break;
                        case Action.NO_COMMAND:
                            speakAudio("Please try Again");
                            break;
                    }
                })
                .catch((err) => {
                    console.log("ERROR", JSON.stringify(err));
                });
        });
    const composed = Gesture.Simultaneous(
        doubleTapGesture,
        tripleTapGesture,
        longPress
    );

    console.log("params", params);
    return (
        <GestureDetector gesture={composed}>
            <View style={styles.container}>
                {params.imgUri && (
                    <Image
                        source={{ uri: getImageDataURI(getBase64()) }}
                        style={{ width: "100%", height: 500 }}
                    />
                )}
                <Text style={styles.caption}>{params.caption}</Text>
                <TouchableOpacity
                    style={styles.btn}
                    onPress={() => {
                        audioControl();
                    }}
                >
                    <Text style={styles.btnText}>
                        {!isPlaying && (
                            <AntDesign
                                name="caretright"
                                size={30}
                                color="white"
                            />
                        )}
                        {isPlaying && (
                            <Ionicons name="pause" size={30} color="white" />
                        )}
                    </Text>
                </TouchableOpacity>
            </View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    container: {
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        gap: 20,
    },
    caption: {
        // color: "",
        fontSize: 25,
        padding: 15,
        textAlign: "center",
    },
    btn: {
        borderWidth: 2,
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginVertical: 50,
        borderRadius: 10,
        backgroundColor: "blue",
    },
    btnText: {
        fontSize: 20,
        // backgroundColor: "blue",
    },
});
