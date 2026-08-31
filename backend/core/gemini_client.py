import os
from typing import Optional, Union, Dict, Any
from dotenv import load_dotenv

load_dotenv()

# Attempt to import google-genai
try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


class GeminiClient:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self._client = None
        if self.api_key and GENAI_AVAILABLE:
            self._client = genai.Client(api_key=self.api_key)

    def is_configured(self) -> bool:
        return self._client is not None or bool(os.getenv("GEMINI_API_KEY"))

    async def generate_text(self, prompt: str, model: str = "gemini-3.6-flash") -> str:
        """
        Generate text completion from a text prompt.
        """
        if not self.api_key:
            return "[Gemini API Key missing. Please set GEMINI_API_KEY in backend/.env]"

        if not self._client and GENAI_AVAILABLE:
            self._client = genai.Client(api_key=self.api_key)

        if self._client:
            try:
                response = self._client.models.generate_content(
                    model=model,
                    contents=prompt
                )
                return response.text
            except Exception as e:
                return f"[Gemini API Error: {str(e)}]"
        
        return "[google-genai SDK not available. Run pip install google-genai]"

    async def generate_from_image(self, image_bytes: bytes, prompt: str, mime_type: str = "image/jpeg", model: str = "gemini-3.6-flash") -> str:
        """
        Analyze image with a text prompt.
        """
        if not self.api_key:
            return "[Gemini API Key missing. Please set GEMINI_API_KEY in backend/.env]"

        if not self._client and GENAI_AVAILABLE:
            self._client = genai.Client(api_key=self.api_key)

        if self._client:
            try:
                part = types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=mime_type
                )
                response = self._client.models.generate_content(
                    model=model,
                    contents=[part, prompt]
                )
                return response.text
            except Exception as e:
                return f"[Gemini Vision Error: {str(e)}]"

        return "[google-genai SDK not available. Run pip install google-genai]"

    async def start_live_session(self):
        """
        Placeholder for Gemini Live API WebSocket session handler.
        """
        raise NotImplementedError("Gemini Live session handler ready.")


# Singleton instance for shared application use
gemini_client = GeminiClient()
