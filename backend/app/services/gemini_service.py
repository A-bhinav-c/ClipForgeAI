
import os
import json
import time

from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables
load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

# Primary model can be configured in backend/.env
MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

FALLBACK_MODELS = [
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
]

# Retry only temporary API errors
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}

MAX_ATTEMPTS_PER_MODEL = 2

if not API_KEY:
    raise ValueError(
        "GEMINI_API_KEY is missing from the backend .env file"
    )

# Keep individual requests reasonably short so retries
# and fallback models have time to run.
client = genai.Client(
    api_key=API_KEY,
    http_options=types.HttpOptions(
        timeout=20000
    )
)


def get_model_list():
    """
    Return the primary model followed by fallback models.
    Remove duplicates while preserving their order.
    """
    return list(dict.fromkeys([MODEL, *FALLBACK_MODELS]))


def generate_with_fallback(prompt, config):
    """
    Generate Gemini content with automatic retry and
    fallback to alternative models when possible.

    Returns:
        (response_text, model_used)
    """

    models = get_model_list()
    last_error = None

    for model_name in models:
        print(f"Trying Gemini model: {model_name}")

        for attempt in range(1, MAX_ATTEMPTS_PER_MODEL + 1):
            try:
                print(
                    f"Gemini request: model={model_name}, "
                    f"attempt={attempt}/{MAX_ATTEMPTS_PER_MODEL}"
                )

                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=config
                )

                response_text = response.text

                if not response_text or not response_text.strip():
                    raise RuntimeError(
                        "Gemini returned an empty response."
                    )

                print(
                    f"Gemini generation successful using {model_name}"
                )

                return response_text, model_name

            except Exception as error:
                last_error = error

                print(
                    f"Gemini error with {model_name}: "
                    f"{type(error).__name__}: {error}"
                )

                status_code = getattr(error, "code", None)

                try:
                    status_code = int(status_code)
                except (TypeError, ValueError):
                    status_code = None

                # A missing model can be skipped in favor of
                # the next configured fallback model.
                if status_code == 404:
                    print(
                        f"Model {model_name} was not found. "
                        "Trying the next model."
                    )
                    break

                # Authentication, invalid request, and other
                # non-retryable errors should be reported directly.
                if status_code not in RETRYABLE_STATUS_CODES:
                    raise RuntimeError(
                        f"Gemini request failed: {error}"
                    ) from error

                # Retry temporary errors with a short delay.
                if attempt < MAX_ATTEMPTS_PER_MODEL:
                    delay = 2 ** (attempt - 1)

                    print(
                        f"Temporary Gemini error. "
                        f"Retrying in {delay} seconds..."
                    )

                    time.sleep(delay)
                else:
                    print(
                        f"Model {model_name} is unavailable. "
                        "Trying the next model."
                    )

    raise RuntimeError(
        "All configured Gemini models failed. "
        "Please try again later. "
        f"Last error: {last_error}"
    )


def generate_video_script(
    topic: str,
    content_type: str = "Educational",
    duration: str = "60 seconds",
    language: str = "English",
    tone: str = "Cinematic"
):
    prompt = f"""
You are an expert AI video scriptwriter for ClipForge AI.

Create a professional video script using these details:

Topic: {topic}
Content category: {content_type}
Duration: {duration}
Language: {language}
Tone: {tone}

Return the result using these sections:

1. Video Title
2. Hook
3. Introduction
4. Main Script
5. Scene-by-scene Visual Suggestions
6. Conclusion
7. Call to Action

Requirements:
- Make the opening hook engaging.
- Keep the script suitable for the requested duration.
- Make the narration natural and engaging.
- Include practical visual suggestions for every scene.
- Write entirely in the requested language.
- Format the output with clear headings.
"""

    print("Starting Gemini script generation...")

    response_text, model_used = generate_with_fallback(
        prompt=prompt,
        config=types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=4000
        )
    )

    print("Gemini script generation completed.")

    return {
        "success": True,
        "script": response_text,
        "model": model_used
    }


def generate_video_scenes(
    script: str,
    duration: str = "60 seconds",
    aspect_ratio: str = "9:16"
):
    prompt = f"""
You are an expert AI video director working for ClipForge AI.

Convert the following video script into a structured scene-by-scene
production plan.

VIDEO DURATION: {duration}
ASPECT RATIO: {aspect_ratio}

SCRIPT:
{script}

INSTRUCTIONS:
1. Divide the script into logical cinematic scenes.
2. Preserve the original message and narration.
3. Ensure timestamps cover the complete video duration.
4. Give each scene a detailed visual description.
5. Create a detailed AI image-generation prompt for each scene.
6. Include suitable camera movements and visual effects.
7. Suggest background audio or sound effects.

Return ONLY valid JSON in this exact structure:

{{
  "title": "Video title",
  "total_duration": "{duration}",
  "aspect_ratio": "{aspect_ratio}",
  "scenes": [
    {{
      "scene_number": 1,
      "title": "Scene title",
      "start_time": "00:00",
      "end_time": "00:05",
      "duration": 5,
      "voiceover": "Narration for this scene",
      "visual_description": "What viewers will see",
      "image_prompt": "Detailed cinematic image generation prompt",
      "camera_movement": "Camera movement",
      "audio_effects": "Music and sound effects"
    }}
  ]
}}

Return valid JSON only. Do not use Markdown code fences.
"""

    print("Starting Gemini scene generation...")

    response_text, model_used = generate_with_fallback(
        prompt=prompt,
        config=types.GenerateContentConfig(
            temperature=0.4,
            response_mime_type="application/json",
            max_output_tokens=6000
        )
    )

    try:
        result = json.loads(response_text)
    except json.JSONDecodeError as error:
        raise RuntimeError(
            "Gemini returned invalid JSON for the scene breakdown."
        ) from error

    if not isinstance(result, dict):
        raise RuntimeError(
            "Gemini scene breakdown must be a JSON object."
        )

    if not isinstance(result.get("scenes"), list) or not result["scenes"]:
        raise RuntimeError(
            "Gemini did not return any scenes."
        )

    print(
        f"Generated {len(result['scenes'])} scenes "
        f"using {model_used}."
    )

    return {
        **result,
        "success": True,
        "model": model_used
    }
