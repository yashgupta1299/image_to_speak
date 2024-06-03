import { Camera, CameraType } from "expo-camera";
import { useState } from "react";
import { Button, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Entypo } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function App() {
    const [type, setType] = useState(CameraType.back);
    const [permission, requestPermission] = Camera.useCameraPermissions();
    const [camera, setCamera] = useState<Camera | null>(null);

    if (!permission) {
        // Camera permissions are still loading
        return <View />;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: "center" }}>
                    We need your permission to show the camera
                </Text>
                <Button onPress={requestPermission} title="grant permission" />
            </View>
        );
    }

    function toggleCameraType() {
        setType((current) =>
            current === CameraType.back ? CameraType.front : CameraType.back
        );
    }

    async function onCapture() {
        if (!camera) {
            console.log("camera not ready");
            return;
        }

        const data = await camera.takePictureAsync({ base64: true });

        const { base64 } = data;
        console.log("IMAGE CAPTURED");

        // router.setParams({ base64: base64 || "" });
        // router.push("/output");
        // // return;

        console.log("SENDING TO API");
        const resp = await fetch(
            "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large",
            {
                method: "POST",
                headers: {
                    Authorization:
                        "Bearer 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",
                },
                body: JSON.stringify({
                    inputs: {
                        image: base64,
                    },
                }),
            }
        );

        const json = await resp.json();
        console.log("API RESPONSE");
        console.log(json[0]["generated_text"]);

        router.setParams({ caption: json[0]["generated_text"] });
        router.navigate({
            pathname: "/output",
            params: { caption: json[0]["generated_text"] },
        });
    }
    return (
        <>
            <View style={styles.container}>
                <Camera
                    ref={setCamera}
                    useCamera2Api={true}
                    style={styles.camera}
                    type={type}
                    // focusable={}
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
                            >
                                <Entypo name="camera" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </Camera>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
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
        borderColor: "white",
        padding: 10,
        borderWidth: 1,
        borderRadius: 10,
    },
    text: {
        fontSize: 24,
        fontWeight: "bold",
        color: "white",
    },
});
