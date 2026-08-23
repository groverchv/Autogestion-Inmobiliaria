"""
Generador de Muestras de Entrenamiento y Sintetizador Inmobiliario
================================================================
Crea muestras de entrenamiento sintéticas/anotadas con daños (grietas, humedad)
y mobiliario arquitectónico para permitir el arranque inmediato del fine-tuning de YOLOv8.
"""

import os
import cv2
import numpy as np
from pathlib import Path

def crear_muestras_sinteticas(base_dir: str):
    train_img_dir = Path(base_dir) / 'datasets' / 'inmobiliario' / 'images' / 'train'
    val_img_dir = Path(base_dir) / 'datasets' / 'inmobiliario' / 'images' / 'val'
    train_lbl_dir = Path(base_dir) / 'datasets' / 'inmobiliario' / 'labels' / 'train'
    val_lbl_dir = Path(base_dir) / 'datasets' / 'inmobiliario' / 'labels' / 'val'

    train_img_dir.mkdir(parents=True, exist_ok=True)
    val_img_dir.mkdir(parents=True, exist_ok=True)
    train_lbl_dir.mkdir(parents=True, exist_ok=True)
    val_lbl_dir.mkdir(parents=True, exist_ok=True)

    print("[INFO] Generando conjunto de datos con muestras anotadas para entrenamiento...")

    # Generamos 20 muestras representativas para entrenar la red
    for i in range(20):
        # Fondo tipo pared/habitación
        img = np.full((640, 640, 3), (230 - (i % 30), 235 - (i % 20), 240 - (i % 25)), dtype=np.uint8)

        # Dibujamos suelo/piso
        cv2.rectangle(img, (0, 480), (640, 640), (140, 150, 160), -1)

        labels = []

        # 1. Puerta (Clase 0)
        cv2.rectangle(img, (60, 180), (180, 480), (100, 70, 50), -1)
        # Formato YOLO: class_id x_center y_center width height (normalizados 0 a 1)
        labels.append(f"0 {120/640:.4f} {330/640:.4f} {120/640:.4f} {300/640:.4f}")

        # 2. Ventana (Clase 1)
        cv2.rectangle(img, (260, 150), (440, 300), (220, 200, 170), 3)
        labels.append(f"1 {350/640:.4f} {225/640:.4f} {180/640:.4f} {150/640:.4f}")

        # 3. Sofá (Clase 2)
        cv2.rectangle(img, (220, 380), (500, 490), (180, 100, 80), -1)
        labels.append(f"2 {360/640:.4f} {435/640:.4f} {280/640:.4f} {110/640:.4f}")

        # 4. Grieta en pared (Clase 9)
        pts = np.array([[300, 80], [315, 110], [305, 135], [325, 160]], np.int32)
        cv2.polylines(img, [pts], False, (40, 40, 40), 2)
        labels.append(f"9 {312/640:.4f} {120/640:.4f} {35/640:.4f} {90/640:.4f}")

        # 5. Mancha de humedad (Clase 10)
        cv2.ellipse(img, (520, 120), (45, 30), 0, 0, 360, (160, 170, 165), -1)
        labels.append(f"10 {520/640:.4f} {120/640:.4f} {90/640:.4f} {60/640:.4f}")

        # Guardar en train (80%) y val (20%)
        is_val = (i >= 16)
        target_img_dir = val_img_dir if is_val else train_img_dir
        target_lbl_dir = val_lbl_dir if is_val else train_lbl_dir

        filename = f"sample_inmueble_{i+1:03d}"
        cv2.imwrite(str(target_img_dir / f"{filename}.jpg"), img)

        with open(target_lbl_dir / f"{filename}.txt", 'w', encoding='utf-8') as f:
            f.write("\n".join(labels))

    print(f"[OK] 20 muestras generadas y anotadas exitosamente en: {base_dir}/datasets/inmobiliario/")

if __name__ == '__main__':
    base_path = os.path.dirname(os.path.abspath(__file__))
    crear_muestras_sinteticas(base_path)
