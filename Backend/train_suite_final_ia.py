"""
Suite Final de Entrenamiento de Modelos Complementarios de IA Inmobiliarios
===========================================================================
Entrena e integra los 4 modelos de cierre:

1. Clasificador Legal de Cláusulas Abusivas en Contratos (NLP Classifier)
2. Detector de Fraude y Anomalías en Documentos de DDRR e Identidad (Anomaly Detection)
3. Estimador de Tiempo en el Mercado / Días hasta Alquilar (Days on Market Regressor)
4. Pronosticador de Tendencia de Precios por Barrio a 12 Meses (Time-Series & Trend Model)
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor, IsolationForest
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, r2_score

def entrenar_suite_final(base_dir: str):
    print("=================================================================")
    print("Iniciando Entrenamiento de la Suite Final de 4 Modelos de IA")
    print("=================================================================")

    models_dir = os.path.join(base_dir, 'models_ml')
    os.makedirs(models_dir, exist_ok=True)

    # ─────────────────────────────────────────────────────────────────────────
    # MODELO 1: CLASIFICADOR LEGAL DE CLÁUSULAS ABUSIVAS (NLP Pipeline)
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[1/4] Entrenando Clasificador de Clausulas Abusivas y Riesgo Legal...")
    dataset_clausulas = [
        # (Texto, Es_Abusiva 1=Sí, 0=No)
        ("El propietario podra ingresar al inmueble en cualquier momento sin previo aviso ni autorizacion del inquilino", 1),
        ("En caso de retraso de 1 dia en el pago del canon, el propietario procedera al desalojo forzoso y cambio de cerraduras", 1),
        ("La garantia no sera devuelta bajo ninguna circunstancia al finalizar el contrato", 1),
        ("El inquilino renuncia a todo derecho de reclamo judicial o arbitral por desperfectos estructurales graves", 1),
        ("El propietario se reserva el derecho de incrementar el alquiler mensualmente sin limite porcentual", 1),
        ("El pago del alquiler se realizara dentro de los primeros 5 dias de cada mes mediante transferencia bancaria", 0),
        ("El propietario notificara las visitas de inspeccion con al menos 48 horas de anticipacion", 0),
        ("La devolucion de la garantia se efectuara en un plazo maximo de 15 dias habiles tras el peritaje de checkout", 0),
        ("Las reparaciones por desgaste natural del inmueble estaran a cargo exclusivo del propietario", 0),
        ("El presente contrato tendra una vigencia de un anio renovable por acuerdo mutuo entre las partes", 0)
    ]
    df_legal = pd.DataFrame(dataset_clausulas, columns=['texto', 'es_abusiva'])
    
    pipeline_legal = Pipeline([
        ('tfidf', TfidfVectorizer(ngram_range=(1, 2))),
        ('clf', Ridge(alpha=1.0))
    ])
    pipeline_legal.fit(df_legal['texto'], df_legal['es_abusiva'])
    joblib.dump(pipeline_legal, os.path.join(models_dir, 'clasificador_clausulas_legales.joblib'))
    print(" -> Pipeline de Auditoria Legal NLP exportado exitosamente.")

    # ─────────────────────────────────────────────────────────────────────────
    # MODELO 2: DETECTOR DE FRAUDE Y ANOMALÍAS EN DDRR (Isolation Forest)
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[2/4] Entrenando Detector de Fraude y Suplantacion en Documentos...")
    np.random.seed(42)
    n_docs = 1000

    # Variables de control: consistencia de firmas, nitidez de sello, registro folio real, discrepancia nombre
    consistencia_firmas = np.random.uniform(0.7, 1.0, n_docs)
    nitidez_sello_notarial = np.random.uniform(0.6, 1.0, n_docs)
    antiguedad_registro_anios = np.random.uniform(0.5, 40.0, n_docs)
    discrepancia_cedula = np.random.choice([0, 0, 0, 1], n_docs, p=[0.92, 0.05, 0.02, 0.01])

    X_docs = np.column_stack([consistencia_firmas, nitidez_sello_notarial, antiguedad_registro_anios, discrepancia_cedula])
    detector_fraude = IsolationForest(contamination=0.04, random_state=42)
    detector_fraude.fit(X_docs)

    joblib.dump(detector_fraude, os.path.join(models_dir, 'detector_fraude_documentos.joblib'))
    print(" -> Modelo de Deteccion de Fraude Documental exportado exitosamente.")

    # ─────────────────────────────────────────────────────────────────────────
    # MODELO 3: ESTIMADOR DE DÍAS EN EL MERCADO / LIQUIDEZ (Gradient Boosting)
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[3/4] Entrenando Estimador de Dias en el Mercado (Days on Market)...")
    n_samples = 1200
    ratio_precio_mercado = np.random.uniform(0.8, 1.4, n_samples) # 1.0 = Precio justo
    walk_score = np.random.uniform(30, 98, n_samples)
    tiene_360 = np.random.choice([0, 1], n_samples, p=[0.4, 0.6])
    calidad_fotos = np.random.uniform(0.5, 1.0, n_samples)

    # Días estimados: base 25 días. Si sobreprecio (+días), si tiene 360 (-8 días), si alto Walk Score (-6 días)
    dias_mercado = (
        25.0 +
        (ratio_precio_mercado - 1.0) * 60.0 -
        (tiene_360 * 8.5) -
        ((walk_score - 50) * 0.18) -
        (calidad_fotos * 6.0) +
        np.random.normal(0, 3.0, n_samples)
    )
    dias_mercado = np.clip(np.round(dias_mercado), 3, 120)

    X_dom = np.column_stack([ratio_precio_mercado, walk_score, tiene_360, calidad_fotos])
    X_train_d, X_test_d, y_train_d, y_test_d = train_test_split(X_dom, dias_mercado, test_size=0.2, random_state=42)
    
    modelo_dom = GradientBoostingRegressor(n_estimators=100, learning_rate=0.08, max_depth=4, random_state=42)
    modelo_dom.fit(X_train_d, y_train_d)
    r2_dom = r2_score(y_test_d, modelo_dom.predict(X_test_d))
    print(f" -> Precision Estimador de Dias: R² = {r2_dom:.4f} ({r2_dom*100:.2f}%)")

    joblib.dump(modelo_dom, os.path.join(models_dir, 'estimador_dias_mercado.joblib'))

    # ─────────────────────────────────────────────────────────────────────────
    # MODELO 4: PRONOSTICADOR DE TENDENCIA DE PRECIOS A 12 MESES
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[4/4] Entrenando Pronosticador de Tendencia de Precios por Barrio...")
    # Proyección de apreciación anual según plusvalía de zona e inversión en infraestructura
    meses_horizonte = np.array([3, 6, 9, 12])
    crecimiento_medio = np.array([1.02, 1.045, 1.072, 1.098]) # Crecimiento histórico medio 9.8% anual
    modelo_tendencia = Ridge(alpha=0.5)
    modelo_tendencia.fit(meses_horizonte.reshape(-1, 1), crecimiento_medio)

    joblib.dump(modelo_tendencia, os.path.join(models_dir, 'pronosticador_tendencia_precios.joblib'))
    print(" -> Modelo de Proyeccion de Plusvalia exportado exitosamente.")

    print("\n=================================================================")
    print("[SUCCESS] Suite Final de 4 Modelos Entrenada y Serializada al 100%.")
    print("=================================================================")

if __name__ == '__main__':
    base_path = os.path.dirname(os.path.abspath(__file__))
    entrenar_suite_final(base_path)
