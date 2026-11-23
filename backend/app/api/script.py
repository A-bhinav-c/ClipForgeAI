
import asyncio

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from app.services.gemini_service import (
    generate_video_script,
    generate_video_scenes
)

router = APIRouter(
    prefix="/api",
    tags=["AI Script Generation"]
)


class ScriptRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=2000)
    content_type: str = "Educational"
    duration: str = "60 seconds"
    language: str = "English"
    tone: str = "Cinematic"


@router.post("/generate-script")
async def generate_script(request: ScriptRequest):

    try:
        print("Received script generation request")

        result = await asyncio.wait_for(
            run_in_threadpool(
                generate_video_script,
                topic=request.topic,
                content_type=request.content_type,
                duration=request.duration,
                language=request.language,
                tone=request.tone
            ),
            timeout=180
        )

        print("Script generated successfully")

        return result

    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Script generation timed out. Please try again."
        )

    except RuntimeError as error:
        raise HTTPException(
            status_code=502,
            detail=str(error)
        )

    except Exception as error:
        print(f"Script generation error: {error}")

        raise HTTPException(
            status_code=500,
            detail="An unexpected script generation error occurred."
        )

class SceneRequest(BaseModel):
    script: str = Field(..., min_length=10, max_length=20000)
    duration: str = "60 seconds"
    aspect_ratio: str = "9:16"


@router.post("/generate-scenes")
async def generate_scenes(request: SceneRequest):

    try:
        print("Received scene generation request")

        result = await asyncio.wait_for(
            run_in_threadpool(
                generate_video_scenes,
                script=request.script,
                duration=request.duration,
                aspect_ratio=request.aspect_ratio
            ),
            timeout=180
        )

        print("Scene breakdown generated successfully")

        return result

    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Scene generation timed out. Please try again."
        )

    except RuntimeError as error:
        raise HTTPException(
            status_code=502,
            detail=str(error)
        )

    except Exception as error:
        print(f"Scene generation error: {error}")

        raise HTTPException(
            status_code=500,
            detail="An unexpected scene generation error occurred."
        )
