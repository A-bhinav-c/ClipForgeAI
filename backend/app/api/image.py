import json
import time
import urllib.request
import urllib.error
import urllib.parse
import base64
import os

from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api", tags=["Image Generation"])

COMFYUI_URL = "http://127.0.0.1:8188"

CLOUDFLARE_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
CLOUDFLARE_API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN")

CLOUDFLARE_MODEL = "@cf/black-forest-labs/flux-1-schnell"

BACKEND_DIR = Path(__file__).resolve().parents[2]
WORKFLOW_PATH = BACKEND_DIR / "workflows" / "image_workflow.json"

GENERATED_IMAGES_DIR = BACKEND_DIR / "generated_images"
GENERATED_IMAGES_DIR.mkdir(exist_ok=True)


class ImageRequest(BaseModel):
    prompt: str = Field(min_length=5, max_length=5000)
    negative_prompt: str = "blurry, low quality, watermark, text, logo"
    width: int = 512
    height: int = 512


# --------------------------------------------------
# SMART PROMPT ENHANCER V4
# STRUCTURED SCENE LOCK
# --------------------------------------------------

def enhance_image_prompt(prompt: str) -> str:
    """
    Smart Prompt Intelligence V4.

    Prioritizes the original scene through structured subject,
    action, environment, camera and composition guidance.

    Rule-based prompt construction; no external AI API.
    """

    prompt = prompt.strip()

    if not prompt:
        return prompt

    prompt_lower = prompt.lower()

    # --------------------------------------------------
    # SCENE CLASSIFICATION
    # --------------------------------------------------

    scene_type = "general"

    scene_categories = {
        "disaster": [
            "disaster", "earthquake", "tsunami", "flood",
            "explosion", "fire", "destruction", "destroyed",
            "collapse", "crash", "storm", "tornado",
            "hurricane", "catastrophe"
        ],

        "space": [
            "space", "planet", "earth", "moon", "galaxy",
            "star", "astronaut", "cosmic", "universe",
            "orbit", "solar system", "meteor", "asteroid"
        ],

        "urban": [
            "city", "urban", "street", "building",
            "skyscraper", "town", "metropolis",
            "architecture", "road", "traffic"
        ],

        "nature": [
            "forest", "tree", "nature", "mountain",
            "landscape", "river", "wildlife", "jungle",
            "desert", "waterfall", "vegetation"
        ],

        "technology": [
            "technology", "robot", "computer",
            "artificial intelligence", "machine",
            "digital", "futuristic", "cyber",
            "electronic", "server", "circuit"
        ],

        "transport": [
            "car", "vehicle", "truck", "bus",
            "motorcycle", "airplane", "train",
            "ship", "boat", "transport"
        ],

        "human": [
            "person", "people", "human", "man",
            "woman", "child", "scientist", "doctor",
            "student", "worker", "portrait", "crowd"
        ],

        "indoor": [
            "room", "interior", "inside", "bedroom",
            "office", "kitchen", "laboratory",
            "classroom", "warehouse"
        ]
    }

    for category, keywords in scene_categories.items():

        if any(keyword in prompt_lower for keyword in keywords):

            scene_type = category
            break

    # --------------------------------------------------
    # CAMERA PERSPECTIVE DETECTION
    # --------------------------------------------------

    camera_guidance = (
        "Use a camera perspective that faithfully matches "
        "the original scene description."
    )

    camera_keywords = {
        "satellite": [
            "satellite view", "satellite", "orbital view",
            "orbit view", "view from orbit"
        ],

        "aerial": [
            "aerial view", "bird's eye", "birds eye",
            "overhead view", "top down", "top-down"
        ],

        "wide": [
            "wide shot", "wide angle", "panoramic",
            "panorama", "establishing shot"
        ],

        "closeup": [
            "close up", "close-up", "closeup",
            "macro shot"
        ],

        "ground": [
            "ground level", "street level",
            "eye level", "eye-level"
        ]
    }

    if any(keyword in prompt_lower
           for keyword in camera_keywords["satellite"]):

        camera_guidance = (
            "CAMERA LOCK: Orbital or satellite perspective. "
            "View the scene from above at planetary or orbital scale. "
            "Do not convert the scene into a ground-level photograph, "
            "portrait, beach scene or unrelated landscape."
        )

    elif any(keyword in prompt_lower
             for keyword in camera_keywords["aerial"]):

        camera_guidance = (
            "CAMERA LOCK: Elevated aerial or overhead perspective. "
            "Show the scene from above. Preserve the intended "
            "top-down spatial relationships."
        )

    elif any(keyword in prompt_lower
             for keyword in camera_keywords["wide"]):

        camera_guidance = (
            "CAMERA LOCK: Wide cinematic establishing shot. "
            "Show the overall environment and spatial scale "
            "without cropping away important subjects."
        )

    elif any(keyword in prompt_lower
             for keyword in camera_keywords["closeup"]):

        camera_guidance = (
            "CAMERA LOCK: Close-up or macro framing. "
            "Prioritize the described subject and its details."
        )

    elif any(keyword in prompt_lower
             for keyword in camera_keywords["ground"]):

        camera_guidance = (
            "CAMERA LOCK: Ground-level or eye-level perspective. "
            "Preserve the specified viewing angle."
        )

    # --------------------------------------------------
    # SUBJECT LOCK
    # --------------------------------------------------

    subject_guidance = (
        "SUBJECT LOCK: Preserve the exact main subject described "
        "in the original scene. Do not substitute the main subject "
        "with a different person, object, animal, planet or setting."
    )

    # --------------------------------------------------
    # ACTION LOCK
    # --------------------------------------------------

    action_guidance = (
        "ACTION LOCK: Preserve the exact action, event or physical "
        "transformation described in the original scene. "
        "Do not replace the described action with an unrelated action."
    )

    # --------------------------------------------------
    # ENVIRONMENT LOCK
    # --------------------------------------------------

    environment_guidance = (
        "ENVIRONMENT LOCK: Preserve the original environment, "
        "location, setting and environmental conditions. "
        "Do not introduce unrelated scenery."
    )

    # --------------------------------------------------
    # SCENE-SPECIFIC GUIDANCE
    # --------------------------------------------------

    scene_guidance = ""

    if scene_type == "disaster":

        scene_guidance = (
            "Render the disaster with believable physical scale, "
            "realistic environmental damage, coherent debris, "
            "natural physical interaction and clear visual storytelling."
        )

    elif scene_type == "space":

        scene_guidance = (
            "Render the space environment with convincing celestial "
            "scale, planetary geometry, atmospheric effects, "
            "realistic celestial lighting and coherent astronomical "
            "visual relationships where appropriate."
        )

    elif scene_type == "urban":

        scene_guidance = (
            "Render believable urban architecture, realistic buildings, "
            "coherent streets, environmental scale and natural "
            "perspective."
        )

    elif scene_type == "nature":

        scene_guidance = (
            "Render natural environments with believable terrain, "
            "vegetation, natural textures, coherent landscapes "
            "and realistic environmental lighting."
        )

    elif scene_type == "technology":

        scene_guidance = (
            "Render technological objects with coherent structures, "
            "realistic materials, functional-looking details "
            "and clean visual design."
        )

    elif scene_type == "transport":

        scene_guidance = (
            "Render vehicles with believable proportions, realistic "
            "mechanical structures, coherent movement and "
            "natural environmental interaction."
        )

    elif scene_type == "human":

        scene_guidance = (
            "Render people with believable anatomy, natural poses, "
            "realistic proportions, coherent facial features "
            "and detailed clothing."
        )

    elif scene_type == "indoor":

        scene_guidance = (
            "Render a coherent interior with realistic spatial "
            "relationships, architecture, furniture, materials "
            "and lighting."
        )

    # --------------------------------------------------
    # WATER GUIDANCE
    # --------------------------------------------------

    water_keywords = [
        "ocean", "sea", "water", "wave", "tsunami",
        "flood", "river", "lake", "rain", "waterfall"
    ]

    water_guidance = ""

    if any(keyword in prompt_lower for keyword in water_keywords):

        water_guidance = (
            "Render water with physically believable movement, "
            "natural reflections, coherent wave structures, "
            "realistic foam and water textures where appropriate."
        )

    # --------------------------------------------------
    # COMPOSITION
    # --------------------------------------------------

    composition_guidance = (
        "COMPOSITION: Create a clear visual hierarchy. "
        "Keep the main subject prominent and correctly positioned. "
        "Maintain realistic perspective, spatial relationships, "
        "foreground and background depth, and balanced framing. "
        "Do not crop away essential parts of the described scene."
    )

    # --------------------------------------------------
    # LIGHTING
    # --------------------------------------------------

    lighting_guidance = (
        "LIGHTING: Use physically believable light sources, "
        "cinematic illumination, natural shadows, balanced contrast, "
        "realistic reflections and atmospheric depth."
    )

    # --------------------------------------------------
    # STYLE AND QUALITY
    # --------------------------------------------------

    quality_guidance = (
        "VISUAL QUALITY: Produce a clean, detailed, coherent, "
        "cinematic image with realistic materials, sharp subject "
        "definition and professional visual quality."
    )

    # --------------------------------------------------
    # NEGATIVE VISUAL GUIDANCE
    # --------------------------------------------------

    artifact_guidance = (
        "AVOID: Unrequested text, captions, typography, watermarks, "
        "logos, duplicated subjects, malformed objects, distorted "
        "anatomy, unrelated subjects, random visual elements "
        "and distracting artifacts."
    )

    # --------------------------------------------------
    # FINAL PROMPT ASSEMBLY
    # --------------------------------------------------

    # Keep the prompt concise for providers with prompt-length limits.
    # The original scene remains first and is preserved in full.
    guidance = " ".join([
        subject_guidance,
        action_guidance,
        environment_guidance,
        camera_guidance,
        scene_guidance,
        water_guidance,
        composition_guidance,
        lighting_guidance,
        quality_guidance,
        artifact_guidance,
        "The original scene is the source of truth. Do not replace it."
    ])

    enhanced_prompt = (
        f"Original scene: {prompt}\n"
        f"Scene type: {scene_type.upper()}.\n"
        f"{guidance}"
    ).strip()

    # Cloudflare FLUX Schnell commonly accepts concise prompts better.
    # Preserve the original scene and cap total prompt length.
    max_prompt_length = 1900
    if len(enhanced_prompt) > max_prompt_length:
        enhanced_prompt = (
            f"Original scene: {prompt}\n"
            "Create a coherent cinematic image faithfully showing the "
            "original subject, action, environment and camera perspective. "
            "Use realistic lighting, clear composition and detailed textures. "
            "Avoid text, logos, watermarks and visual artifacts."
        )

    return enhanced_prompt


# --------------------------------------------------
# WORKFLOW LOADING
# --------------------------------------------------

def load_workflow():
    try:
        with open(WORKFLOW_PATH, "r", encoding="utf-8") as file:
            return json.load(file)

    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="Image workflow file not found."
        )


# --------------------------------------------------
# COMFYUI HISTORY RETRIEVAL
# --------------------------------------------------

def get_comfyui_history(prompt_id):
    url = f"{COMFYUI_URL}/history/{prompt_id}"

    with urllib.request.urlopen(url, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


# --------------------------------------------------
# CLOUDFLARE FLUX IMAGE GENERATION
# --------------------------------------------------

def generate_cloudflare_image(request: ImageRequest):

    if not CLOUDFLARE_ACCOUNT_ID or not CLOUDFLARE_API_TOKEN:
        raise Exception("Cloudflare credentials are missing.")

    url = (
        "https://api.cloudflare.com/client/v4/accounts/"
        f"{CLOUDFLARE_ACCOUNT_ID}/ai/run/{CLOUDFLARE_MODEL}"
    )

    headers = {
        "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
        "Content-Type": "application/json"
    }

    payload = {
        "prompt": request.prompt
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=180) as response:
        result = json.loads(response.read().decode("utf-8"))

    image_data = result.get("result", {}).get("image")

    if not image_data:
        raise Exception("Cloudflare did not return image data.")

    image_bytes = base64.b64decode(image_data)

    filename = f"flux_{int(time.time() * 1000)}.png"

    image_path = GENERATED_IMAGES_DIR / filename

    with open(image_path, "wb") as file:
        file.write(image_bytes)

    return {
        "success": True,
        "message": "Image generated successfully with Cloudflare FLUX.",
        "provider": "cloudflare",
        "image_url": (
            f"http://127.0.0.1:8000/api/cloudflare-generated-image"
            f"?filename={urllib.parse.quote(filename)}"
        )
    }


# --------------------------------------------------
# COMFYUI IMAGE GENERATION (FALLBACK)
# --------------------------------------------------

def generate_comfyui_image(request: ImageRequest):

    workflow = load_workflow()

    workflow["2"]["inputs"]["text"] = request.prompt
    workflow["3"]["inputs"]["text"] = request.negative_prompt
    workflow["4"]["inputs"]["width"] = request.width
    workflow["4"]["inputs"]["height"] = request.height

    payload = json.dumps({
        "prompt": workflow
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=30) as response:
        result = json.loads(response.read().decode("utf-8"))

    prompt_id = result.get("prompt_id")

    if not prompt_id:
        raise Exception("ComfyUI did not return a prompt ID.")

    timeout_seconds = 240
    start_time = time.time()

    while time.time() - start_time < timeout_seconds:

        history = get_comfyui_history(prompt_id)
        prompt_history = history.get(prompt_id)

        if prompt_history:

            outputs = prompt_history.get("outputs", {})
            save_output = outputs.get("7", {})
            images = save_output.get("images", [])

            if images:

                image = images[0]

                filename = image.get("filename")
                subfolder = image.get("subfolder", "")
                image_type = image.get("type", "output")

                if not filename:
                    raise Exception(
                        "Generated image filename was not returned."
                    )

                return {
                    "success": True,
                    "message": "Image generated successfully with ComfyUI.",
                    "provider": "comfyui",
                    "prompt_id": prompt_id,
                    "image_url": (
                        f"http://127.0.0.1:8000/api/generated-image"
                        f"?filename={urllib.parse.quote(filename)}"
                        f"&subfolder={urllib.parse.quote(subfolder)}"
                        f"&type={urllib.parse.quote(image_type)}"
                    )
                }

        time.sleep(2)

    raise Exception("ComfyUI image generation timed out.")


# --------------------------------------------------
# PROVIDER STATUS
# --------------------------------------------------

@router.get("/comfyui-status")
def comfyui_status():

    try:
        with urllib.request.urlopen(
            f"{COMFYUI_URL}/system_stats",
            timeout=5
        ):
            return {
                "connected": True,
                "message": "ComfyUI is running."
            }

    except Exception:

        return {
            "connected": False,
            "message": "ComfyUI is not reachable."
        }


@router.get("/image-provider-status")
def image_provider_status():

    return {
        "primary": "Cloudflare FLUX.1 Schnell",
        "cloudflare_configured": bool(
            CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN
        ),
        "fallback": "ComfyUI Stable Diffusion 1.5"
    }


# --------------------------------------------------
# MAIN IMAGE GENERATION ENDPOINT
# --------------------------------------------------

@router.post("/generate-image")
def generate_image(request: ImageRequest):

    # Enhance the prompt before sending it to any provider.

    enhanced_prompt = enhance_image_prompt(request.prompt)

    enhanced_request = request.model_copy(
        update={
            "prompt": enhanced_prompt
        }
    )

    cloudflare_error_message = "Unknown Cloudflare error"

    # Try Cloudflare FLUX first.

    try:

        return generate_cloudflare_image(enhanced_request)

    except Exception as error:

        cloudflare_error_message = str(error)

        print(
            "Cloudflare image generation failed:",
            cloudflare_error_message
        )

    # If Cloudflare fails, try ComfyUI.

    try:

        result = generate_comfyui_image(enhanced_request)

        result["message"] = (
            "Cloudflare unavailable. Image generated using ComfyUI fallback."
        )

        return result

    except Exception as comfyui_error:

        raise HTTPException(
            status_code=503,
            detail=(
                "Both image generation providers failed. "
                f"Cloudflare error: {cloudflare_error_message}. "
                f"ComfyUI error: {str(comfyui_error)}."
            )
        )


# --------------------------------------------------
# CLOUDFLARE IMAGE RETRIEVAL
# --------------------------------------------------

@router.get("/cloudflare-generated-image")
def get_cloudflare_generated_image(filename: str):

    if (
        not filename
        or Path(filename).name != filename
        or not filename.startswith("flux_")
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid image filename."
        )

    image_path = GENERATED_IMAGES_DIR / filename

    if not image_path.is_file():

        raise HTTPException(
            status_code=404,
            detail="Generated image not found."
        )

    try:

        with open(image_path, "rb") as file:
            image_bytes = file.read()

        return Response(
            content=image_bytes,
            media_type="image/png"
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Could not retrieve generated image: {str(error)}"
        )


# --------------------------------------------------
# EXISTING COMFYUI IMAGE RETRIEVAL
# --------------------------------------------------

@router.get("/generated-image")
def get_generated_image(
    filename: str,
    subfolder: str = "",
    image_type: str = "output"
):

    if (
        not filename
        or Path(filename).name != filename
        or image_type not in {"output", "temp"}
        or ".." in subfolder.replace("\\", "/").split("/")
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid image location."
        )

    params = urllib.parse.urlencode({
        "filename": filename,
        "subfolder": subfolder,
        "type": image_type
    })

    try:

        url = f"{COMFYUI_URL}/view?{params}"

        with urllib.request.urlopen(url, timeout=30) as response:

            image_bytes = response.read()

            content_type = response.headers.get(
                "Content-Type",
                "image/png"
            )

        return Response(
            content=image_bytes,
            media_type=content_type
        )

    except urllib.error.HTTPError as error:

        raise HTTPException(
            status_code=error.code,
            detail="Could not retrieve generated image from ComfyUI."
        )

    except Exception as error:

        raise HTTPException(
            status_code=503,
            detail=f"Could not retrieve image: {str(error)}"
        )