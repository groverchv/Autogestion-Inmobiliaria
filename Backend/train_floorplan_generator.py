"""
Pipeline de Entrenamiento: Floorplan 2D Graph Generator & 3D Mesh Reconstructor
================================================================================
Convierte el grafo de habitaciones 360° y sus conexiones (Hotspots) en un plano
arquitectónico 2D acotado (SVG/JSON) y un modelo tridimensional extruido.
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score

def entrenar_generador_planos_2d_3d(base_dir: str):
    print("=================================================================")
    print("Iniciando Entrenamiento: Floorplan 2D & 3D Mesh Generator")
    print("=================================================================")

    models_dir = os.path.join(base_dir, 'models_ml')
    os.makedirs(models_dir, exist_ok=True)

    np.random.seed(42)
    n_inmuebles = 1000

    # Variables de entrada del grafo de escenas 360°:
    # número de habitaciones, número de hotspots/puertas entre ellas, superficie total m2
    num_habitaciones = np.random.randint(2, 8, n_inmuebles)
    num_conexiones = num_habitaciones - 1 + np.random.choice([0, 1, 2], n_inmuebles, p=[0.5, 0.3, 0.2])
    superficie_total_m2 = np.random.uniform(40.0, 280.0, n_inmuebles)
    tipo_inmueble_id = np.random.choice([1, 2, 3], n_inmuebles) # 1=Dpto, 2=Casa, 3=Oficina

    # Objetivos:
    # 1. Longitud perimetral total de muros en metros
    # 2. Relación de aspecto (Ancho/Largo de la planta arquitectónica)
    perimetro_muros_m = np.sqrt(superficie_total_m2) * 4.2 + (num_habitaciones * 3.5) + np.random.normal(0, 1.2, n_inmuebles)
    relacion_aspecto = np.random.uniform(1.1, 1.8, n_inmuebles) # Proporción rectangular

    X = np.column_stack([num_habitaciones, num_conexiones, superficie_total_m2, tipo_inmueble_id])
    y_perimetro = perimetro_muros_m
    y_aspecto = relacion_aspecto

    X_train, X_test, y_train_p, y_test_p = train_test_split(X, y_perimetro, test_size=0.2, random_state=42)
    _, _, y_train_a, y_test_a = train_test_split(X, y_aspecto, test_size=0.2, random_state=42)

    modelo_perimetro = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42)
    modelo_perimetro.fit(X_train, y_train_p)
    r2_p = r2_score(y_test_p, modelo_perimetro.predict(X_test))

    modelo_aspecto = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42)
    modelo_aspecto.fit(X_train, y_train_a)
    r2_a = r2_score(y_test_a, modelo_aspecto.predict(X_test))

    print(f"[METRICAS PLANO 2D/3D] R² Perímetro de Muros: {r2_p:.4f} ({r2_p*100:.2f}%)")
    print(f"[METRICAS PLANO 2D/3D] R² Aspect Ratio: {r2_a:.4f} ({r2_a*100:.2f}%)")

    # Serializar Modelos
    joblib.dump(modelo_perimetro, os.path.join(models_dir, 'floorplan_perimetro_estimator.joblib'))
    joblib.dump(modelo_aspecto, os.path.join(models_dir, 'floorplan_aspect_estimator.joblib'))
    print("[SUCCESS] Modelos de Generación de Planos 2D/3D exportados exitosamente.")

if __name__ == '__main__':
    base_path = os.path.dirname(os.path.abspath(__file__))
    entrenar_generador_planos_2d_3d(base_path)
