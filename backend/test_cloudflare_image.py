import os
import requests
import base64
from dotenv import load_dotenv

load_dotenv()

ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN")

url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell"

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

payload = {
    "prompt": "A cinematic futuristic city at sunset, flying vehicles, realistic architecture, ultra detailed, cinematic lighting, high quality"
}

print("Sending request to Cloudflare FLUX...")

response = requests.post(
    url,
    headers=headers,
    json=payload,
    timeout=120
)

print("HTTP Status:", response.status_code)

if response.status_code == 200:
    result = response.json()

    image_data = result["result"]["image"]

    image_bytes = base64.b64decode(image_data)

    with open("cloudflare_test.png", "wb") as f:
        f.write(image_bytes)

    print("SUCCESS! Image saved as cloudflare_test.png")

else:
    print("API Error:")
    print(response.text)