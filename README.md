# Image Speak App

## Tech Stack Frontend
- React Native
- Expo
- React Native Gesture Handler

## Tech Stack Backend
- FastAPI
- ngrok
- Pytorch

### ImageSpeak: Empowering Visual Understanding

> - ImageSpeak is a hackathon challenge aimed at enhancing accessibility for individuals
who are blind or visually impaired. The challenge focuses on developing a deep learning
model capable of generating descriptive captions for images, enabling users to gain
meaningful insights from visual content.

### Instructions for setting up the project locally

> - Create two different environment with both environment file independently.

> - Give executable access to all .sh files via `chmod +x <$PATH>` command

> - run `./main_file.sh`

> - run `./main_file_asr.sh` in different terminal

> - Now you can access both API's at 8000 and 8085 ports respectively

### Description
This API handles various tasks including reading the root, uploading images, handling audio data, and viewing scene captions.

> - You can find detailed documentation on `/docs` route

## Endpoints for 8000
- **Read Root**
  - **Description**: Reads the root.
  - **Method**: GET
  - **Path**: `/`
- **Upload Image**
  - **Description**: Uploads an image.
  - **Method**: POST
  - **Path**: `/upload`
- **Audio**
  - **Description**: Handles audio data.
  - **Method**: POST
  - **Path**: `/audio`
- **View**
  - **Description**: Views scene caption.
  - **Method**: POST
  - **Path**: `/scene-caption`

## Endpoints for 8085
- **Read Root**
  - **Description**: Reads the root.
  - **Method**: GET
  - **Path**: `/`
- **ASR (Automatic Speech Recognition)**
  - **Description**: Uploads a WAV file for automatic speech recognition.
  - **Method**: POST
  - **Path**: `/asr`
