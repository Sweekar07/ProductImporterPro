import requests
import hashlib
import hmac
import json
import logging

from app.exceptions.custom_exceptions import InternalServerException

logger = logging.getLogger(__name__)

def send_webhook(url: str, payload: dict, secret_key: str = None, timeout: int = 10):
    """
    Send webhook POST request with optional HMAC signature
    """
    try:
        headers = {'Content-Type': 'application/json'}
        
        # Add HMAC signature if secret key provided
        if secret_key:
            payload_str = json.dumps(payload)
            signature = hmac.new(
                secret_key.encode(),
                payload_str.encode(),
                hashlib.sha256
            ).hexdigest()
            headers['X-Webhook-Signature'] = signature
        
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=timeout
        )
        
        response.raise_for_status()
        logger.info(f"Webhook sent successfully to {url}: {response.status_code}")
        return response.status_code
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Webhook request failed to {url}: {e}")
        raise InternalServerException("Failed to send webhook")
