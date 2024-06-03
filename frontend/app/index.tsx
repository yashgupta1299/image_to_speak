import { Camera, CameraType } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
    Button,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Entypo, Foundation } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import * as FileSystem from "expo-file-system";
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from "react-native-gesture-handler";
import {
    ASR_URL,
    SCENE_DESCRIBE_API,
    UPLOAD_URL,
    getData,
    getImageDataURI,
    setData,
    speakAudio,
} from "@/utils";
import { Action, SCENE_LIST } from "@/constants";
import axios from "axios";
import { Audio } from "expo-av";
import {
    AndroidAudioEncoder,
    AndroidOutputFormat,
    IOSOutputFormat,
    Recording,
} from "expo-av/build/Audio";

import * as Haptics from "expo-haptics";
import { useStore } from "@/hooks/use-store";

export default function Index() {
    return (
        <View
            style={{
                flex: 1,
                justifyContent: "center",
            }}
        >
            <GestureHandlerRootView>
                <App />
            </GestureHandlerRootView>
        </View>
    );
}

function App() {
    const [type, setType] = useState(CameraType.back);
    const [cameraPermission, requestCameraPermission] =
        Camera.useCameraPermissions();
    const [audioPermission, requestAudioPermission] = Audio.usePermissions();
    const [camera, setCamera] = useState<Camera | null>(null);
    const [recording, setRecording] = useState<Recording | undefined>();
    // console.log("ASSETS", require("./assets/sounds/shutter.ogg"));
    const [capturing, setCapturing] = useState(false);
    const recordTimeRef = useRef<Date | undefined>();

    const { setBase64, getBase64 } = useStore();

    const printData = async () => {
        const scenes = await getData(SCENE_LIST);
        console.log("Scenes", scenes);
    };

    // printData();
    useEffect(() => {
        setBase64("");
    }, []);

    // printData();
    const gesture = Gesture.Tap()
        .maxDuration(250)
        .numberOfTaps(2)
        .onEnd((event, success) => {
            if (success) {
                onCapture();
            }
        });

    if (!cameraPermission || !audioPermission) {
        // Camera permissions are still loading
        return <View />;
    }

    if (!cameraPermission.granted) {
        // Camera permissions are not granted yet
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: "center" }}>
                    We need your permission to show the camera
                </Text>

                <TouchableOpacity
                    onPress={requestCameraPermission}
                    style={styles.permissionBtn}
                >
                    <Text style={styles.permissionBtnText}>
                        Camera Permission
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }
    if (!audioPermission?.granted) {
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: "center" }}>
                    We need your permission to access the mic
                </Text>

                <TouchableOpacity
                    onPress={requestAudioPermission}
                    style={styles.permissionBtn}
                >
                    <Text style={styles.permissionBtnText}>
                        Audio Permission
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    function toggleCameraType() {
        setType((current) =>
            current === CameraType.back ? CameraType.front : CameraType.back
        );
    }

    async function onCapture() {
        if (capturing) {
            return;
        }

        if (!camera) {
            console.log("camera not ready");
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setCapturing(true);

        const data = await camera.takePictureAsync({ base64: true });

        speakAudio("Captured, Please wait");
        const { uri, base64 } = data;
        setBase64(base64 || "");
        // console.log("URI", getBase64());
        // router.navigate({
        //     pathname: "/output",
        //     params: { caption: "Test Output for image", imgUri: uri },
        // });

        FileSystem.uploadAsync(UPLOAD_URL, uri, {
            fieldName: "file",
            mimeType: "image/jpg",
            httpMethod: "POST",
            headers: { "ngrok-skip-browser-warning": "NA" },

            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        })
            .then(async (doc) => {
                console.log("DOC BODY", doc.body);

                const respBody = JSON.parse(doc.body);
                const scenes = await getData(SCENE_LIST);
                if (!scenes) {
                    await setData(SCENE_LIST, [respBody["caption"]]);
                } else {
                    if (scenes.length == 5) {
                        scenes.shift();
                    }
                    await setData(SCENE_LIST, [...scenes, respBody["caption"]]);
                }

                router.navigate({
                    pathname: "/output",
                    params: { caption: respBody["caption"], imgUri: uri },
                });
            })
            .catch((err) => {
                console.log("ERROR", JSON.stringify(err));
            });
    }

    async function onSceneDescribe() {
        console.log("DESCRIBE SCENE");
        const scenes = await getData(SCENE_LIST);
        if (!scenes || scenes?.length == 0) {
            console.log("No scenes available");
            onCapture();
            return;
        }

        speakAudio("Please Wait");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        if (scenes.length == 1) {
            router.navigate({
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
            router.navigate({
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
            recordTimeRef.current = new Date();
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
        .onEnd(
            async (event, success) => {
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
                            case Action.CAPTURE:
                                onCapture();
                                break;
                            case Action.DESCRIBE:
                                onSceneDescribe();
                                break;
                            case Action.CLEAR:
                                await setData(SCENE_LIST, []);
                                speakAudio("Cleared");
                                break;
                            case Action.NO_COMMAND:
                                speakAudio("Please try Again");
                                break;
                        }
                    })
                    .catch((err) => {
                        console.log("ERROR", JSON.stringify(err));
                    });
            }
            // console.log("Long Press", success);
            // if (success) {
            //     startRecording();
            // } else {
            //     stopRecording();
            // }
        );

    const composed = Gesture.Simultaneous(gesture, longPress);

    return (
        <GestureDetector gesture={composed}>
            <View style={styles.container}>
                {getBase64() && (
                    <Image
                        source={{ uri: getImageDataURI(getBase64()) }}
                        style={{ maxWidth: 500, height: 500 }}
                    />
                )}
                {!getBase64() && (
                    <Camera
                        ref={setCamera}
                        useCamera2Api={true}
                        style={styles.camera}
                        type={type}
                        autoFocus={true}
                    >
                        <View style={styles.buttonsOuterContainer}>
                            <View style={styles.buttonsInnerContainer}>
                                <TouchableOpacity
                                    style={[styles.button]}
                                    onPress={toggleCameraType}
                                >
                                    <MaterialIcons
                                        name="flip-camera-android"
                                        size={24}
                                        color="white"
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button]}
                                    onPress={onCapture}
                                    disabled={capturing}
                                >
                                    <Entypo
                                        name="camera"
                                        size={24}
                                        color="white"
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button]}
                                    onPress={onSceneDescribe}
                                >
                                    <Foundation
                                        name="photo"
                                        size={24}
                                        color="white"
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button]}
                                    onPress={async () => {
                                        await setData(SCENE_LIST, []);
                                        const scenes = await getData(
                                            SCENE_LIST
                                        );
                                        console.log("SCENES", scenes);
                                    }}
                                >
                                    <Foundation
                                        name="trash"
                                        size={24}
                                        color="white"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Camera>
                )}

                {/* <TouchableOpacity
                    onPress={() => {
                        setBase64("");
                        setCapturing(false);
                    }}
                >
                    <Text>Clear</Text>
                </TouchableOpacity>
                <Link
                    href={{
                        pathname: "/output",
                        params: {
                            caption:
                                "A laptop is kept on a wooden table with a person typing",
                        },
                    }}
                >
                    Output
                </Link>
                <Link href={"/test"}>TEST</Link>
                <TouchableOpacity
                    onPress={() => {
                        speakAudio("button pressed");
                    }}
                >
                    <Text>Play Sound</Text>
                </TouchableOpacity> */}
            </View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    permissionBtn: {
        backgroundColor: "blue",
        paddingVertical: 15,
        marginVertical: 20,
        fontSize: 18,
        color: "white",
        textAlign: "center",
        borderRadius: 5,
        marginHorizontal: 25,
    },
    permissionBtnText: {
        color: "white",
        fontSize: 18,
        textAlign: "center",
    },
    container: {
        // flex: 1,
        // justifyContent: "center",
    },
    camera: {
        // flex: 1,
        width: "100%",
        height: 600,
    },

    buttonsOuterContainer: {
        flex: 1,
        // flexDirection: "c",
        backgroundColor: "transparent",
        margin: 64,
        justifyContent: "flex-end",
    },

    buttonsInnerContainer: {
        flexDirection: "row",
        justifyContent: "space-evenly",
        // flex: 1,
    },

    button: {
        // flex: 1,
        // alignSelf: "flex-end",
        // alignItems: "center",
        // borderColor: "white",
        padding: 15,
        // borderWidth: 1,
        borderRadius: 10,
        backgroundColor: "blue",
    },
    text: {
        fontSize: 24,
        fontWeight: "bold",
        color: "white",
    },
});
