"""
Entrenamiento y Fine-Tuning de Modelo Personalizado: YOLOv8 Inmobiliario
========================================================================
Especializado en Detección de:
1. Mobiliario Arquitectónico (Sofá, Cama, Mesa, Silla, Refrigerador, Cocina, TV, Puerta, Ventana)
2. Patologías y Daños Inmobiliarios (Grieta estructural, Mancha de humedad, Descascaramiento, Vidrio roto)

Uso:
  python train_yolo_inmobiliario.py --epochs 50 --batch 16 --imgsz 640
"""

import os
import sys
import yaml
from pathlib import Path

def preparar_dataset_yaml(base_dir: str) -> str:
    """Genera la estructura de dataset y el archivo data.yaml para Ultralytics."""
    dataset_dir = Path(base_dir) / 'datasets' / 'inmobiliario'
    dataset_dir.mkdir(parents=True, exist_ok=True)
    
    (dataset_dir / 'images' / 'train').mkdir(parents=True, exist_ok=True)
    (dataset_dir / 'images' / 'val').mkdir(parents=True, exist_ok=True)
    (dataset_dir / 'labels' / 'train').mkdir(parents=True, exist_ok=True)
    (dataset_dir / 'labels' / 'val').mkdir(parents=True, exist_ok=True)

    clases = [
        'puerta',
        'ventana',
        'sofa',
        'cama',
        'mesa',
        'silla',
        'refrigerador',
        'cocina',
        'televisor',
        'grieta_pared',
        'mancha_humedad',
        'descascaramiento_pintura',
        'vidrio_roto'
    ]

    data_yaml_content = {
        'path': str(dataset_dir.absolute()),
        'train': 'images/train',
        'val': 'images/val',
        'names': {i: name for i, name in enumerate(clases)}
    }

    yaml_path = dataset_dir / 'inmobiliario.yaml'
    with open(yaml_path, 'w', encoding='utf-8') as f:
        yaml.dump(data_yaml_content, f, sort_keys=False)

    print(f"[OK] Estructura de dataset y configuracion generada en: {yaml_path}")
    print(f"[INFO] Clases a detectar ({len(clases)}): {', '.join(clases)}")
    return str(yaml_path)

def entrenar_modelo(yaml_config_path: str, epochs: int = 50, batch: int = 16, imgsz: int = 640):
    """Ejecuta el pipeline de Transfer Learning sobre yolov8n.pt."""
    try:
        from ultralytics import YOLO
    except ImportError:
        print("[ERROR] Ultralytics no esta instalado. Instale con: pip install ultralytics")
        return

    print("=================================================================")
    print("Iniciando Fine-Tuning de YOLOv8 para Peritaje Inmobiliario")
    print(f"Epochs: {epochs} | Batch: {batch} | Image Size: {imgsz}")
    print("=================================================================")

    # Cargar pesos base ligeros para transferencia de aprendizaje
    modelo_base = 'yolov8n.pt'
    model = YOLO(modelo_base)

    # Entrenar modelo
    results = model.train(
        data=yaml_config_path,
        epochs=epochs,
        batch=batch,
        imgsz=imgsz,
        patience=15,
        save=True,
        device='cpu', # o '0' para GPU CUDA si esta disponible
        project='runs/inmobiliario_check',
        name='yolov8_inmobiliario_custom',
        verbose=True
    )

    print("[SUCCESS] Entrenamiento completado con exito.")
    print("Pesos exportados en: runs/inmobiliario_check/yolov8_inmobiliario_custom/weights/best.pt")
    return results

if __name__ == '__main__':
    base_path = os.path.dirname(os.path.abspath(__file__))
    yaml_file = preparar_dataset_yaml(base_path)
    
    # Inicia el entrenamiento con 5 épocas rápidas para generar los pesos best.pt
    entrenar_modelo(yaml_file, epochs=5, batch=4, imgsz=320)

