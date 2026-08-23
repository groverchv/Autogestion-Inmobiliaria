"""
Entrenamiento y Generación del Modelo de Valuación Inmobiliaria Inteligente
==========================================================================
Entrena un modelo de Machine Learning (GradientBoostingRegressor & RandomForest)
para predecir el precio de mercado justo (Alquiler y Venta) según:
- Superficie (m²)
- Número de Habitaciones y Baños
- Coordenadas / Zona
- Walk Score y Calidad de Vida del Barrio (0-100)
- Presencia de Garaje, Balcón, Piscina y Recorrido 360°
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

def generar_dataset_valuacion(n_samples: int = 1200) -> pd.DataFrame:
    """Genera datos sintéticos con distribuciones reales del mercado inmobiliario."""
    np.random.seed(42)
    
    # 1. Variables Físicas
    m2 = np.random.uniform(35.0, 320.0, n_samples)
    dormitorios = np.clip(np.round(m2 / 45.0) + np.random.choice([-1, 0, 1], n_samples, p=[0.2, 0.6, 0.2]), 1, 6).astype(int)
    banios = np.clip(np.round(dormitorios * 0.8) + np.random.choice([0, 1], n_samples, p=[0.7, 0.3]), 1, 5).astype(int)
    parqueos = np.random.choice([0, 1, 2], n_samples, p=[0.3, 0.5, 0.2])
    
    # 2. Entorno y Geoespacial
    walk_score = np.random.uniform(30.0, 98.0, n_samples)
    distancia_centro_km = np.random.uniform(0.5, 18.0, n_samples)
    
    # 3. Amenidades y Valor Agregado
    tiene_360 = np.random.choice([0, 1], n_samples, p=[0.4, 0.6])
    es_estreno = np.random.choice([0, 1], n_samples, p=[0.6, 0.4])
    
    # 4. Fórmula Base de Precio Realista (Alquiler mensual en Bs.)
    # Precio base por m² según cercanía al centro y Walk Score
    precio_m2_base = 35.0 + (walk_score * 0.25) - (distancia_centro_km * 1.2) + (es_estreno * 8.0)
    precio_alquiler = (m2 * precio_m2_base) + (banios * 180) + (parqueos * 350) + (tiene_360 * 120)
    # Ruido de mercado normal (±8%)
    ruido = np.random.normal(1.0, 0.06, n_samples)
    precio_alquiler = np.round(precio_alquiler * ruido, -1) # Redondear a decenas

    # 5. Precio de Venta (Bs.) aprox 180-220 meses de alquiler
    precio_venta = np.round(precio_alquiler * np.random.uniform(190, 220, n_samples), -2)

    df = pd.DataFrame({
        'superficie_m2': np.round(m2, 1),
        'dormitorios': dormitorios,
        'banios': banios,
        'parqueos': parqueos,
        'walk_score': np.round(walk_score, 1),
        'distancia_centro_km': np.round(distancia_centro_km, 2),
        'tiene_360': tiene_360,
        'es_estreno': es_estreno,
        'precio_alquiler_bs': precio_alquiler,
        'precio_venta_bs': precio_venta
    })
    return df

def entrenar_modelo_valuacion(base_dir: str):
    print("=================================================================")
    print("Iniciando Entrenamiento: Valuador Inmobiliario Inteligente con ML")
    print("=================================================================")
    
    df = generar_dataset_valuacion(1500)
    
    X = df[['superficie_m2', 'dormitorios', 'banios', 'parqueos', 'walk_score', 'distancia_centro_km', 'tiene_360', 'es_estreno']]
    y_alquiler = df['precio_alquiler_bs']
    y_venta = df['precio_venta_bs']

    X_train, X_test, y_train_alq, y_test_alq = train_test_split(X, y_alquiler, test_size=0.2, random_state=42)
    _, _, y_train_ven, y_test_ven = train_test_split(X, y_venta, test_size=0.2, random_state=42)

    # 1. Modelo de Alquiler (Gradient Boosting Regressor)
    modelo_alquiler = GradientBoostingRegressor(n_estimators=120, learning_rate=0.08, max_depth=4, random_state=42)
    modelo_alquiler.fit(X_train, y_train_alq)

    # 2. Modelo de Venta (Random Forest Regressor)
    modelo_venta = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42)
    modelo_venta.fit(X_train, y_train_ven)

    # Métricas
    preds_alq = modelo_alquiler.predict(X_test)
    r2_alq = r2_score(y_test_alq, preds_alq)
    mae_alq = mean_absolute_error(y_test_alq, preds_alq)

    preds_ven = modelo_venta.predict(X_test)
    r2_ven = r2_score(y_test_ven, preds_ven)
    mae_ven = mean_absolute_error(y_test_ven, preds_ven)

    print(f"[METRICAS ALQUILER] R² Score: {r2_alq:.4f} (Precisión: {r2_alq*100:.2f}%) | Error Medio MAE: Bs. {mae_alq:.2f}")
    print(f"[METRICAS VENTA]    R² Score: {r2_ven:.4f} (Precisión: {r2_ven*100:.2f}%) | Error Medio MAE: Bs. {mae_ven:.2f}")

    # Guardar Modelos Serializados
    modelos_dir = os.path.join(base_dir, 'models_ml')
    os.makedirs(modelos_dir, exist_ok=True)
    
    path_alq = os.path.join(modelos_dir, 'valuador_alquiler.joblib')
    path_ven = os.path.join(modelos_dir, 'valuador_venta.joblib')
    
    joblib.dump(modelo_alquiler, path_alq)
    joblib.dump(modelo_venta, path_ven)

    print(f"[SUCCESS] Modelos exportados en:")
    print(f" - {path_alq}")
    print(f" - {path_ven}")

if __name__ == '__main__':
    base_path = os.path.dirname(os.path.abspath(__file__))
    entrenar_modelo_valuacion(base_path)
