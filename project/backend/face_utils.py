import os
import json
import cv2
import numpy as np
from deepface import DeepFace
from typing import List, Tuple, Optional, Dict
from scipy.ndimage import rotate

ARCFACE_MODEL_NAME = "ArcFace"
DETECTOR = "retinaface"  
DEFAULT_THRESHOLD = 0.3  

def _l2_normalize(v: np.ndarray) -> np.ndarray:
    v = np.asarray(v, dtype=float)
    norm = np.linalg.norm(v)
    if norm == 0 or np.isnan(norm):
        return v
    return v / norm


def _preprocess_aggressive(img_bgr: np.ndarray) -> np.ndarray:
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    lab = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l2 = clahe.apply(l)
    lab2 = cv2.merge((l2, a, b))
    img_rgb = cv2.cvtColor(lab2, cv2.COLOR_LAB2RGB)
    img_f = img_rgb.astype(np.float32)
    blurred = cv2.GaussianBlur(img_f, (0, 0), sigmaX=1.0)
    
    sharp = img_f + 0.6 * (img_f - blurred)
    sharp = np.clip(sharp, 0, 255).astype(np.uint8)
    return sharp


def _preprocess_basic(img_bgr: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)


def _augment_variants(img_rgb: np.ndarray, include_rotations: bool = True) -> List[np.ndarray]:
    variants = [img_rgb]
    flipped = cv2.flip(img_rgb, 1)
    variants.append(flipped)

    if include_rotations:
        try:
            r1 = rotate(img_rgb, -8, reshape=False, mode='reflect').astype(np.uint8)
            r2 = rotate(img_rgb, +8, reshape=False, mode='reflect').astype(np.uint8)
            variants.append(r1)
            variants.append(r2)
            variants.append(cv2.flip(r1, 1))
            variants.append(cv2.flip(r2, 1))
        except Exception:
            pass
    unique = []
    seen = set()
    for v in variants:
        key = (v.shape, v.tobytes()[:32] if v.size > 32 else v.tobytes())
        if key not in seen:
            seen.add(key)
            unique.append(v)
    return unique

def get_face_embedding(image_path: str,
                       tta: bool = True,
                       aggressive_preproc: bool = False,
                       detector_backend: str = DETECTOR) -> Optional[np.ndarray]:
    try:
        bgr = cv2.imread(image_path)
        if bgr is None:
            return None

        img_rgb = _preprocess_aggressive(bgr) if aggressive_preproc else _preprocess_basic(bgr)

        images_for_emb = _augment_variants(img_rgb, include_rotations=tta)

        embs = []
        for img in images_for_emb:
            try:
                rep = DeepFace.represent(
                    img,
                    model_name=ARCFACE_MODEL_NAME,
                    detector_backend=detector_backend,
                    enforce_detection=False,
                    align=True
                )
                if isinstance(rep, list) and len(rep) > 0:
                    emb = np.array(rep[0]["embedding"], dtype=float)
                    if np.linalg.norm(emb) == 0 or np.isnan(np.linalg.norm(emb)):
                        continue
                    embs.append(_l2_normalize(emb))
            except Exception:
                continue

        if len(embs) == 0:
            try:
                rep = DeepFace.represent(
                    _preprocess_basic(bgr),
                    model_name=ARCFACE_MODEL_NAME,
                    detector_backend=detector_backend,
                    enforce_detection=False,
                    align=True
                )
                if isinstance(rep, list) and len(rep) > 0:
                    emb = np.array(rep[0]["embedding"], dtype=float)
                    if np.linalg.norm(emb) == 0 or np.isnan(np.linalg.norm(emb)):
                        return None
                    return _l2_normalize(emb)
            except Exception:
                return None

        stacked = np.stack(embs, axis=0)
        mean_emb = np.mean(stacked, axis=0)
        return _l2_normalize(mean_emb)

    except Exception:
        return None

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    if a is None or b is None:
        return -1.0
    a = _l2_normalize(a)
    b = _l2_normalize(b)
    return float(np.dot(a, b))


def dynamic_threshold_for_pair(img_bgr_query: Optional[np.ndarray] = None,
                               img_bgr_db: Optional[np.ndarray] = None) -> float:
    def sharpness(img):
        if img is None:
            return 0.0
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        return float(cv2.Laplacian(gray, cv2.CV_64F).var())

    base = 0.35
    if img_bgr_query is not None:
        s = sharpness(img_bgr_query)
        if s > 350:
            base = 0.50
        elif s > 150:
            base = 0.46
        else:
            base = 0.42

    if img_bgr_db is not None and img_bgr_query is not None:
        s2 = sharpness(img_bgr_db)
        avg = (sharpness(img_bgr_query) + s2) / 2.0
        if avg > 350:
            base = max(base, 0.50)
    return base


def find_closest_celebrity(input_emb: np.ndarray,
                          celebrities: List[object],
                          threshold: float = DEFAULT_THRESHOLD) -> Tuple[Optional[object], Optional[float]]:
    if input_emb is None:
        return None, None

    best = None
    best_score = -1.0

    for celeb in celebrities:
        raw = getattr(celeb, "embedding", None)
        if raw is None:
            continue

        try:
            db_emb = np.array(json.loads(raw)) if isinstance(raw, str) else np.array(raw)
            if db_emb.size == 0 or np.linalg.norm(db_emb) == 0:
                continue
            score = cosine_similarity(input_emb, db_emb)
            if score > best_score:
                best_score = float(score)
                best = celeb
        except Exception:
            continue

    if best_score >= threshold:
        return best, best_score
    return None, None

def build_db_from_folder(folder: str, verbose: bool = True,
                         tta: bool = True, aggressive_preproc: bool = False) -> List[Dict]:
    db = []
    exts = ('.jpg', '.jpeg', '.png', '.bmp')
    for root, _, files in os.walk(folder):
        for fn in files:
            if not fn.lower().endswith(exts):
                continue
            path = os.path.join(root, fn)
            emb = get_face_embedding(path, tta=tta, aggressive_preproc=aggressive_preproc)
            if emb is None:
                if verbose:
                    print(f"[build_db] skip (no emb): {path}")
                continue
            db.append({
                "id": fn,
                "image_path": path,
                "embedding": emb.tolist()
            })
            if verbose:
                print(f"[build_db] added: {fn}")
    return db


if __name__ == "__main__":
    DB_FOLDER = "celeb_db"
    PROBE = "probe.jpg"

    print("Building DB (may take time)...")
    db = build_db_from_folder(DB_FOLDER, verbose=True)
    print("DB size:", len(db))

    probe_bgr = cv2.imread(PROBE)
    if probe_bgr is None:
        print("Probe not found:", PROBE)
        exit(0)

    probe_emb = get_face_embedding(PROBE)
    if probe_emb is None:
        print("Could not extract probe embedding")
        exit(0)

    threshold = dynamic_threshold_for_pair(probe_bgr)
    matches, used_threshold = None, threshold
    class _Tmp:
        def __init__(self, embedding, image_path, id_):
            self.embedding = embedding
            self.image_path = image_path
            self.id = id_

    celebs = [_Tmp(item["embedding"], item["image_path"], item["id"]) for item in db]
    best, score = find_closest_celebrity(probe_emb, celebs, threshold=threshold)
    if best is not None:
        print(f"Best: {best.id} ({best.image_path}) score={score:.4f} threshold={threshold:.3f}")
    else:
        print("No match above threshold:", threshold)
