"""
Suite de IA Espacial y Analítica Arquitectónica Avanzada (4 Modelos de Próxima Generación)
========================================================================================
Entrena e integra:
1. Clasificador de Eficiencia Energética e Iluminación Solar Pasiva (Thermal & Solar Score)
2. Estimador de Confort Acústico y Nivel de Ruido Ambiental Urbano (Acoustic Comfort Engine)
3. Reconocedor de Estilos Arquitectónicos y Decorativos (Architectural Style Classifier)
4. Optimizador Dinámico de Precios / Revenue Management para Alquileres (Dynamic Pricing Engine)
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, r2_score

def entrenar_suite_arquitectura_avanzada(base_dir: str):
    print("=================================================================")
    print("Iniciando Entrenamiento: Suite de Analítica Espacial & Arquitectura")
    print("=================================================================")

    models_dir = os.path.join(base_dir, 'models_ml')
    os.makedirs(models_dir, exist_ok=True)

    # ─────────────────────────────────────────────────────────────────────────
    # MODELO 1: EFICIENCIA ENERGÉTICA Y CONFORT SOLAR (Random Forest)
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[1/4] Entrenando Clasificador de Eficiencia Energetica & Confort Solar...")
    np.random.seed(42)
    n_muestras = 1200

    superficie_vidriada_pct = np.random.uniform(0.10, 0.60, n_muestras) # % de pared con ventanas
    orientacion_norte_sur = np.random.choice([0, 1], n_muestras, p=[0.4, 0.6]) # 1 = Orientación favorable
    piso_nivel = np.random.randint(1, 25, n_muestras)
    tiene_doble_vidrio = np.random.choice([0, 1], n_muestras, p=[0.7, 0.3])
    tiene_aleros_sombra = np.random.choice([0, 1], n_muestras, p=[0.5, 0.5])

    # Score de Eficiencia A, B, C (0=Bajo, 1=Medio, 2=Alto/Eco-Friendly)
    eficiencia_score = (
        (orientacion_norte_sur * 0.35) +
        (tiene_doble_vidrio * 0.30) +
        (tiene_aleros_sombra * 0.20) +
        np.where(orientacion_norte_sur == 1, superficie_vidriada_pct * 0.40, -(superficie_vidriada_pct * 0.20)) +
        np.random.normal(0, 0.05, n_muestras)
    )
    categoria_eficiencia = pd.qcut(eficiencia_score, q=3, labels=[0, 1, 2]).astype(int)


    X_ef = np.column_stack([superficie_vidriada_pct, orientacion_norte_sur, piso_nivel, tiene_doble_vidrio, tiene_aleros_sombra])
    X_train_e, X_test_e, y_train_e, y_test_e = train_test_split(X_ef, categoria_eficiencia, test_size=0.2, random_state=42)

    modelo_eficiencia = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    modelo_eficiencia.fit(X_train_e, y_train_e)
    acc_ef = accuracy_score(y_test_e, modelo_eficiencia.predict(X_test_e))
    print(f" -> Precision Eficiencia Energetica: {acc_ef*100:.2f}%")

    joblib.dump(modelo_eficiencia, os.path.join(models_dir, 'clasificador_eficiencia_energetica.joblib'))

    # ─────────────────────────────────────────────────────────────────────────
    # MODELO 2: ESTIMADOR DE CONFORT ACÚSTICO Y DECIBELES (Gradient Boosting)
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[2/4] Entrenando Estimador de Confort Acustico & Ruido Ambiental Urbano...")
    distancia_avenida_m = np.random.uniform(10, 800, n_muestras)
    flujo_vehicular_score = np.random.uniform(1.0, 10.0, n_muestras) # 10 = Avenida de alto tráfico
    altura_piso = np.random.randint(1, 25, n_muestras)
    es_calle_cerrada = np.random.choice([0, 1], n_muestras, p=[0.75, 0.25])

    # Nivel estimado en Decibeles (dBA): Tráfico base 75 dBA, decae con logaritmo de distancia
    ruido_dba = (
        72.0 -
        (15.0 * np.log10(np.clip(distancia_avenida_m, 10, 800) / 10.0)) +
        (flujo_vehicular_score * 1.5) -
        (es_calle_cerrada * 8.0) -
        (np.clip(altura_piso - 4, 0, 20) * 0.4) +
        np.random.normal(0, 1.5, n_muestras)
    )
    ruido_dba = np.clip(np.round(ruido_dba, 1), 35.0, 82.0)

    X_ac = np.column_stack([distancia_avenida_m, flujo_vehicular_score, altura_piso, es_calle_cerrada])
    X_train_a, X_test_a, y_train_a, y_test_a = train_test_split(X_ac, ruido_dba, test_size=0.2, random_state=42)

    modelo_acustico = GradientBoostingRegressor(n_estimators=100, learning_rate=0.08, max_depth=4, random_state=42)
    modelo_acustico.fit(X_train_a, y_train_a)
    r2_ac = r2_score(y_test_a, modelo_acustico.predict(X_test_a))
    print(f" -> Precision Confort Acustico: R² = {r2_ac:.4f} ({r2_ac*100:.2f}%)")

    joblib.dump(modelo_acustico, os.path.join(models_dir, 'estimador_confort_acustico.joblib'))

    # ─────────────────────────────────────────────────────────────────────────
    # MODELO 3: RECONOCEDOR DE ESTILOS ARQUITECTÓNICOS Y DECORATIVOS (NLP Style)
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[3/4] Entrenando Clasificador de Estilos Arquitectonicos y Decorativos...")
    corpus_estilos = [
        # (Texto descriptivo/anotación, Estilo: 0=Minimalista, 1=Industrial, 2=Nórdico/Escandinavo, 3=Clásico/Lujo)
        ("lineas limpias espacios abiertos tonos blancos madera clara iluminacion natural muebles funcionales", 0),
        ("paredes de concreto visto ladrillo expuesto ductos metalicos hierro forjado techos altos ventanales negros", 1),
        ("madera calida textiles claros plantas interiores luz abundante diseno acogedor hygge", 2),
        ("molduras doradas marmol pulido candelabros columnas elegantes pisos de parquet detalles barrocos", 3),
        ("sin sobrecarga visual colores neutros orden absoluto armarios empotrados minimalismo puro", 0),
        ("estilo loft vigas de acero tuberias visibles acabado rustico urbano industrial", 1),
        ("muebles de pino tonos pastel simplicidad funcionalidad luz solar madera nordica", 2),
        ("acabados de lujo cornisas trabajadas lamparas de cristal decoracion senorial clasica", 3)
    ]
    df_estilos = pd.DataFrame(corpus_estilos, columns=['texto', 'estilo_id'])
    
    pipeline_estilo = Pipeline([
        ('tfidf', TfidfVectorizer(ngram_range=(1, 2))),
        ('clf', RandomForestClassifier(n_estimators=80, random_state=42))
    ])
    pipeline_estilo.fit(df_estilos['texto'], df_estilos['estilo_id'])
    joblib.dump(pipeline_estilo, os.path.join(models_dir, 'clasificador_estilo_arquitectonico.joblib'))
    print(" -> Clasificador de Estilos Arquitectonicos exportado exitosamente.")

    # ─────────────────────────────────────────────────────────────────────────
    # MODELO 4: OPTIMIZADOR DINÁMICO DE PRECIOS / REVENUE MANAGEMENT
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[4/4] Entrenando Optimizador Dinamico de Precios (Dynamic Pricing Engine)...")
    temporada_alta = np.random.choice([0, 1], n_muestras, p=[0.7, 0.3]) # Feriados / Expocruz
    ocupacion_barrio_pct = np.random.uniform(40.0, 98.0, n_muestras)
    dias_antelacion = np.random.randint(1, 45, n_muestras)
    precio_base_dia = np.random.uniform(180.0, 950.0, n_muestras)

    # Multiplicador dinámico óptimo (0.85 a 1.45)
    multiplicador = (
        1.0 +
        (temporada_alta * 0.22) +
        ((ocupacion_barrio_pct - 70.0) * 0.005) -
        (np.clip(dias_antelacion - 15, 0, 30) * 0.003) +
        np.random.normal(0, 0.02, n_muestras)
    )
    precio_dinamico_sugerido = np.round(precio_base_dia * multiplicador, -1)

    X_dyn = np.column_stack([precio_base_dia, temporada_alta, ocupacion_barrio_pct, dias_antelacion])
    X_train_dy, X_test_dy, y_train_dy, y_test_dy = train_test_split(X_dyn, precio_dinamico_sugerido, test_size=0.2, random_state=42)

    modelo_pricing = GradientBoostingRegressor(n_estimators=100, learning_rate=0.08, max_depth=4, random_state=42)
    modelo_pricing.fit(X_train_dy, y_train_dy)
    r2_dy = r2_score(y_test_dy, modelo_pricing.predict(X_test_dy))
    print(f" -> Precision Optimizador de Precios: R² = {r2_dy:.4f} ({r2_dy*100:.2f}%)")

    joblib.dump(modelo_pricing, os.path.join(models_dir, 'optimizador_precios_dinamicos.joblib'))

    print("\n=================================================================")
    print("[SUCCESS] Los 4 Modelos de Analitica Espacial fueron entrenados.")
    print("=================================================================")

if __name__ == '__main__':
    base_path = os.path.dirname(os.path.abspath(__file__))
    entrenar_suite_arquitectura_avanzada(base_path)
