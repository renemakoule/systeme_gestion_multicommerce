import base64
import io
import uuid
import os
from PIL import Image

def process_and_save_image(base64_str: str, folder: str = "products") -> str:
    """
    Décode, compresse et sauvegarde une image Base64.
    folder: sous-dossier dans static/uploads/ (ex: 'products', 'messages')
    Retourne l'URL statique (ex: '/static/uploads/products/xyz.webp')
    """
    try:
        if not base64_str or not base64_str.startswith("data:image"):
            return base64_str
            
        # 1. Extraire les données
        header, encoded = base64_str.split(",", 1)
        image_data = base64.b64decode(encoded)
        
        # 2. Ouvrir avec Pillow
        image = Image.open(io.BytesIO(image_data))
        
        # 3. Optimisation : Convertir en RGB (si RGBA)
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
            
        # 4. Redimensionner si trop grand (max 800px)
        max_size = 800
        if max(image.size) > max_size:
            ratio = max_size / max(image.size)
            new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
            image = image.resize(new_size, Image.LANCZOS)
            
        # 5. Calculer le chemin absolu
        # On se base sur l'emplacement de ce fichier
        service_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(service_dir)
        upload_dir = os.path.join(backend_dir, "static", "uploads", folder)
        os.makedirs(upload_dir, exist_ok=True)
        
        filename = f"{uuid.uuid4()}.webp"
        filepath = os.path.join(upload_dir, filename)
        image.save(filepath, "WEBP", quality=80, optimize=True)
        
        return f"/static/uploads/{folder}/{filename}"
        
    except Exception as e:
        print(f"Error processing image in {folder}: {e}")
        return base64_str
