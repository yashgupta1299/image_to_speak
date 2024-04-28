## Importing the required libraries for model
import torch
from huggingsound import SpeechRecognitionModel
from fastapi import FastAPI, Request, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from aiofiles import open as aio_open
import time
import warnings

warnings.filterwarnings("ignore")



cpu_device = torch.device("cpu")

model_asr = SpeechRecognitionModel("jonatasgrosman/wav2vec2-large-xlsr-53-english", device=cpu_device)


app = FastAPI()


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    print(f"Start Time {start_time}, Processing time: {process_time * 1000}")
    response.headers["X-Process-Time"] = str(process_time)
    return response


@app.get("/")
def read_root():
    return {"message": "ASR"}

async def save_wav_file(file: UploadFile):
    try:
        # Read file contents synchronously
        contents = await file.read()
        async with aio_open("uploaded_file.wav", 'wb') as out_file:
            # Write file contents asynchronously
            await out_file.write(contents)
        return "uploaded_file.wav"
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/asr")
async def upload_wav_file(file: UploadFile = File(...)):
    try:
        audio_path = await save_wav_file(file)
        audio_paths = [audio_path]
        transcriptions = model_asr.transcribe(audio_paths)
        words = transcriptions[0]['transcription']
        words = words.lower().strip().split(' ')
        commands = ['reset', 'replay', 'capture', 'describe', 'clear']
        send_command = 'no_command'
        for word in words:
            if word in commands:
                send_command = word
                break
        return JSONResponse(content={"action": send_command})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)