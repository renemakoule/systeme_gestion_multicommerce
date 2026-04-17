from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt

# Configuration de la sécurité
SECRET_KEY = "SUPER_SECRET_KEY_A_MODIFIER" # À mettre dans un .env plus tard
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 heures

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifier un mot de passe en le comparant au hachage stocké."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), 
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Générer un hachage sécurisé pour un mot de passe."""
    # salt est généré automatiquement
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
