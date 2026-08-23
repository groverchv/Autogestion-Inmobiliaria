"""
Pipeline de Entrenamiento: Segmentación de Instancias Arquitectónicas (YOLOv8-Seg)
==================================================================================
Entrena un modelo de Deep Learning para Segmentación Poligonal de:
- Suelos y Pisos (para cambio de texturas/parquet en RA)
- Paredes (para pintura virtual y cálculo de m² de muro)
- Techos y Aberturas (Puertas, Ventanas)
"""

import os
import yaml
from pathlib import Path

def preparar_dataset_segmentacion(base_dir: str) -> str:
    dataset_dir = Path(base_dir) / 'datasets' / 'inmobiliario_seg'
    (dataset_dir / 'images' / 'train').mkdir(parents=True, exist_ok=True)
    (dataset_dir / 'images' / 'val').mkdir(parents=True, exist_ok=True)
    (dataset_dir / 'labels' / 'train').mkdir(parents=True, exist_ok=True)
    (dataset_dir / 'labels' / 'val').mkdir(parents=True, exist_ok=True)

    clases = [
        'piso',
        'pared',
        'techo',
        'puerta',
        'ventana',
        'mueble'
    ]

    data_yaml_content = {
        'path': str(dataset_dir.absolute()),
        'train': 'images/train',
        'val': 'images/val',
        'names': {i: name for i, name in enumerate(clases)}
    }

    yaml_path = dataset_dir / 'inmobiliario_seg.yaml'
    with open(yaml_path, 'w', encoding='utf-8') as f:
        yaml.dump(data_yaml_content, f, sort_keys=False)

    return str(yaml_path)

def generar_muestras_segmentacion(base_dir: str):
    import cv2
    import numpy as np

    train_img_dir = Path(base_dir) / 'datasets' / 'inmobiliario_seg' / 'images' / 'train'
    val_img_dir = Path(base_dir) / 'datasets' / 'inmobiliario_seg' / 'images' / 'val'
    train_lbl_dir = Path(base_dir) / 'datasets' / 'inmobiliario_seg' / 'labels' / 'train'
    val_lbl_dir = Path(base_dir) / 'datasets' / 'inmobiliario_seg' / 'labels' / 'val'

    print("[INFO] Generando dataset de poligonos de segmentacion arquitectonica...")

    for i in range(16):
        img = np.full((640, 640, 3), (220, 225, 230), dtype=np.uint8)

        # 1. Polígono Suelo (Piso - Clase 0)
        cv2.rectangle(img, (0, 460), (640, 640), (120, 130, 140), -1)
        # Formato YOLO-Seg: class_id x1 y1 x2 y2 x3 y3 x4 y4 (normalizados)
        lbl_piso = "0 0.0 0.7188 1.0 0.7188 1.0 1.0 0.0 1.0"

        # 2. Polígono Pared (Clase 1)
        lbl_pared = "1 0.0 0.2500 1.0 0.2500 1.0 0.7188 0.0 0.7188"

        # 3. Polígono Techo (Clase 2)
        cv2.rectangle(img, (0, 0), (640, 160), (245, 245, 245), -1)
        lbl_techo = "2 0.0 0.0 1.0 0.0 1.0 0.2500 0.0 0.2500"

        labels = [lbl_piso, lbl_pared, lbl_techo]

        is_val = (i >= 12)
        t_img = val_img_dir if is_val else train_img_dir
        t_lbl = val_lbl_dir if is_val else train_lbl_dir

        filename = f"seg_sample_{i+1:03d}"
        cv2.imwrite(str(t_img / f"{filename}.jpg"), img)
        with open(t_lbl / f"{filename}.txt", 'w', encoding='utf-8') as f:
            f.write("\n".join(labels))

    print("[OK] Muestras de poligonos arquitectonicos generadas con exito.")

def entrenar_segmentacion():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    yaml_path = preparar_dataset_segmentacion(base_dir)
    generar_muestras_segmentacion(base_dir)

    try:
        from ultralytics import YOLO
    except ImportError:
        print("[ERROR] Ultralytics no disponible.")
        return

    print("=================================================================")
    print("Iniciando Entrenamiento: YOLOv8-Seg Segmentación de Planos y Muros")
    print("=================================================================")

    # Cargar modelo base de segmentación pre-entrenado
    model = YOLO('yolov8n-seg.pt')

    results = model.train(
        data=yaml_path,
        epochs=5,
        batch=4,
        imgsz=320,
        save=True,
        device='cpu',
        project='runs/inmobiliario_seg_check',
        name='yolov8_seg_inmobiliario',
        verbose=True
    )

    print("[SUCCESS] Modelo de Segmentación de Instancias Arquitectónicas entrenado exitosamente.")

if __name__ == '__main__':
    entrenar_segmentacion()
