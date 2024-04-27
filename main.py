## Importing the required libraries for model
import torch
import base64
from PIL import Image
from transformers import BlipProcessor, BlipForConditionalGeneration
import warnings
import base64
from io import BytesIO
from gtts import gTTS
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import matplotlib.pyplot as plt
from pydantic import BaseModel

warnings.filterwarnings("ignore")


processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large")

device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
# device = torch.device("cpu")

model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-large", torch_dtype=torch.float16).to(device)

def get_image_caption(raw_image):
    inputs = processor(raw_image, return_tensors="pt").to(device, torch.float16)
    out = model.generate(**inputs)
    caption = processor.decode(out[0], skip_special_tokens=True)
    return caption


app = FastAPI()

class ImageData(BaseModel):
    base64: str

class TextData(BaseModel):
    text: str


@app.get("/")
def read_root():
    return {"message": "Welcome to the image captioning API!"}

# @app.post("/upload")
# async def upload_image(file: UploadFile = File(...)):
#     try:
#         contents = await file.read()
#         raw_image = Image.open(io.BytesIO(contents)).convert('RGB')
#         # plt.imshow(image)
#         # plt.show()
#         caption = get_image_caption(raw_image)
#         return JSONResponse(content={"caption": caption})
#     except Exception as e:
#         return JSONResponse(content={"error": str(e)}, status_code=500)


@app.post("/caption")
async def caption(obj: ImageData):
    try:
        raw_image = Image.open(BytesIO(base64.decodebytes(bytes(obj.base64, "utf-8")))).convert('RGB')
        caption = get_image_caption(raw_image)
        return JSONResponse(content={"caption": caption})

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)



@app.post("/audio")
async def audio(obj: TextData):
    try:
        audio_object = gTTS(text=obj.text, lang='en', slow=False)

        # Save the audio file in a BytesIO container
        mp3_fp = BytesIO()
        audio_object.write_to_fp(mp3_fp)
        mp3_fp.seek(0)  # rewind the file to the beginning

        # Encode the BytesIO stream to Base64
        base64_encoded_audio = base64.b64encode(mp3_fp.read()).decode('utf-8')
        return JSONResponse(content={"audio": base64_encoded_audio})

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
