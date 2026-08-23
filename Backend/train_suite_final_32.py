"""
Suite de Entrenamiento Final: Ciberseguridad, Seguros y Recomendación de Reformas (Modelos 29 a 32)
==================================================================================================
Entrena e integra los 4 modelos de cierre del ecosistema de 32 Modelos de IA:
1. Validador de Pólizas de Seguro de Alquiler e Indemnizaciones (Insurance Claim Scorer)
2. Motor de Recomendación de Reformas con Mayor Retorno de Inversión (Renovation ROI Recommender)
3. Detector de Ciberseguridad y Accesos Anómalos al Sistema (Cybersecurity Anomaly Detector)
4. Estimador de Valor Residual y Desecho de Materiales de Construcción (Circular Economy Estimator)
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestClassifier, IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, r2_score

def entrenar_suite_final_32(base_dir: str):
    print("=================================================================")
    print("Iniciando Entrenamiento: Suite de Seguros, Reformas & Ciberseguridad (4 Modelos)")
    print("=================================================================")

    models_dir = os.path.join(base_dir, 'models_ml')
    os.makedirs(models_dir, exist_ok=True)

    np.random.seed(42)
    n_muestras = 1200

    # ─────────────────────────────────────────────────────────────────────────
    # MODELO 29: VALIDADOR DE PÓLIZAS DE SEGURO Y COBERTURA (Insurance Claim)
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[1/4] Entrenando Validador de Polizas de Seguro & Cobertura...")
    monto_reclamado_bs = np.random.uniform(500.0, 15000.0, n_muestras)
    antiguedad_poliza_meses = np.random.uniform(1.0, 24.0, n_muestras)
    evidencia_fotos_360 = np.random.choice([0, 1], n_muestras, p=[0.1, 0.9])
    tipo_siniestro_id = np.random.choice([0, 1, 2], n_muestras) # 0=Humedad, 1=Vidrios, 2=Cerradura

    # Probabilidad de aprobación inmediata de cobertura (0 a 1)
    cobertura_procede = (
        (evidencia_fotos_360 * 0.45) +
        (antiguedad_poliza_meses / 24.0) * 0.25 -
        (monto_reclamado_bs / 15000.0) * 0.20 +
        np.random.normal(0, 0.05, n_muestras)
    )
    es_aprobado = (cobertura_procede >= 0.42).astype(int)

    X_ins = np.column_stack([monto_reclamado_bs, antiguedad_poliza_meses, evidencia_fotos_360, tipo_siniestro_id])
    X_train_i, X_test_i, y_train_i, y_test_i = train_test_split(X_ins, es_aprobado, test_size=0.2, random_state=42)

    modelo_seguro = RandomForestClassifier(n_estimators=60, random_state=42)
    modelo_seguro.fit(X_train_i, y_train_i)
    acc_ins = accuracy_score(y_test_i, modelo_seguro.predict(X_test_i))
    print(f" -> Precision Validador de Seguros: {acc_ins*100:.2f}%")

    joblib.dump(modelo_seguro, os.path.join(models_dir, 'insurance_claim_validator.joblib'))

    # ─────────────────────────────────────────────────────────────────────────
    # MODELO 30: RECOMENDADOR DE REFORMAS CON ALTO ROI (Renovation ROI Engine)
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[2/4] Entrenando Recomendador de Reformas con Alto Retorno de Inversion...")
    inversion_reforma_usd = np.random.uniform(500.0, 12000.0, n_muestras)
    tipo_mejora = np.random.choice([0, 1, 2, 3], n_muestras) # 0=Pintura, 1=Cocina/Marmol, 2=Piso Parquet, 3=Banio
    edad_inmueble = np.random.uniform(2.0, 30.0, n_muestras)
    zona_plusvalia = np.random.uniform(1.0, 3.0, n_muestras) # 3=Equipetrol / Zona Norte

    # Incremento porcentual en valor de renta estimado (ROI %)
    incremento_renta_pct = (
        (tipo_mejora * 4.5) +
        (zona_plusvalia * 5.0) +
        (edad_inmueble * 0.4) -
        (inversion_reforma_usd / 12000.0 * 3.0) +
        np.random.normal(0, 1.0, n_muestras)
    )
    incremento_renta_pct = np.clip(np.round(incremento_renta_pct, 1), 3.0, 35.0)

    X_ren = np.column_stack([inversion_reforma_usd, tipo_mejora, edad_inmueble, zona_plusvalia])
    X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(X_ren, incremento_renta_pct, test_size=0.2, random_state=42)

    modelo_ren = GradientBoostingRegressor(n_estimators=100, learning_rate=0.08, max_depth=4, random_state=42)
    modelo_ren.fit(X_train_r, y_train_r)
    r2_ren = r2_score(y_test_r, modelo_ren.predict(X_test_r))
    print(f" -> Precision Motor de Retorno de Reformas: R² = {r2_ren:.4f} ({r2_ren*100:.2f}%)")

    joblib.dump(modelo_ren, os.path.join(models_dir, 'renovation_roi_recommender.joblib'))

    # ─────────────────────────────────────────────────────────────────────────
    # MODELO 31: DETECTOR DE CIBERSEGURIDAD Y ANOMALÍAS DE ACCESO (Isolation Forest)
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[3/4] Entrenando Detector de Accesos Anomalos y Ciberseguridad...")
    peticiones_por_minuto = np.random.uniform(1.0, 60.0, n_muestras)
    discrepancia_geolocalizacion_ip = np.random.choice([0, 1], n_muestras, p=[0.96, 0.04])
    intentos_fallidos_auth = np.random.randint(0, 4, n_muestras)
    hora_acceso = np.random.uniform(0.0, 24.0, n_muestras)

    X_sec = np.column_stack([peticiones_por_minuto, discrepancia_geolocalizacion_ip, intentos_fallidos_auth, hora_acceso])
    detector_sec = IsolationForest(contamination=0.03, random_state=42)
    detector_sec.fit(X_sec)

    joblib.dump(detector_sec, os.path.join(models_dir, 'cybersecurity_anomaly_detector.joblib'))
    print(" -> Detector de Anomalías de Seguridad y Acceso exportado exitosamente.")

    # ─────────────────────────────────────────────────────────────────────────
    # MODELO 32: ESTIMADOR DE VALOR RESIDUAL Y ECONOMÍA CIRCULAR
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[4/4] Entrenando Estimador de Valor Residual & Economia Circular...")
    volumen_escombros_m3 = np.random.uniform(1.0, 25.0, n_muestras)
    pct_material_reciclable = np.random.uniform(0.2, 0.85, n_muestras)
    tipo_estructura = np.random.choice([0, 1, 2], n_muestras) # 0=Drywall, 1=Ladrillo, 2=Hormigón

    # Valor de reventa/reutilización de materiales en Bs.
    valor_recuperable_bs = (
        (volumen_escombros_m3 * 180.0 * pct_material_reciclable) +
        (tipo_estructura * 250.0) +
        np.random.normal(0, 40.0, n_muestras)
    )
    valor_recuperable_bs = np.clip(np.round(valor_recuperable_bs, 0), 100.0, 6000.0)

    X_circ = np.column_stack([volumen_escombros_m3, pct_material_reciclable, tipo_estructura])
    X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(X_circ, valor_recuperable_bs, test_size=0.2, random_state=42)

    modelo_circ = GradientBoostingRegressor(n_estimators=80, learning_rate=0.08, max_depth=4, random_state=42)
    modelo_circ.fit(X_train_c, y_train_c)
    r2_circ = r2_score(y_test_c, modelo_circ.predict(X_test_c))
    print(f" -> Precision Estimador de Economia Circular: R² = {r2_circ:.4f} ({r2_circ*100:.2f}%)")

    joblib.dump(modelo_circ, os.path.join(models_dir, 'circular_economy_estimator.joblib'))

    print("\n=================================================================")
    print("[SUCCESS] El Catalogo Maestro de 32 Modelos de IA esta COMPLETO al 100%.")
    print("=================================================================")

if __name__ == '__main__':
    base_path = os.path.dirname(os.path.abspath(__file__))
    entrenar_suite_final_32(base_path)
