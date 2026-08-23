"""
Suite de Entrenamiento: Voz Emocional & Gemelos Digitales (Fases 3 y 4 del Plan Maestro)
========================================================================================
Entrena e integra los 4 modelos de cierre del Plan Maestro:
1. Emotion & Buyer Interest Voice Detector (Detector de Entusiasmo del Comprador en el Tour)
2. Predictive Maintenance Engine (Mantenimiento Preventivo de Instalaciones)
3. Lead Conversion & Closing Score (Probabilidad de Cierre de Alquiler/Venta)
4. Emotive Voice Modulation Recommender (Entonación de Guía Turístico según Ambiente)
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestRegressor, RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, r2_score, roc_auc_score

def entrenar_suite_fases_3_y_4(base_dir: str):
    print("=================================================================")
    print("Iniciando Entrenamiento: Voz Emocional & Gemelos Digitales (Fases 3 y 4)")
    print("=================================================================")

    models_dir = os.path.join(base_dir, 'models_ml')
    os.makedirs(models_dir, exist_ok=True)

    np.random.seed(42)
    n_muestras = 1200

    # ─────────────────────────────────────────────────────────────────────────
    # MODELO 1: DETECTOR DE INTERÉS Y ENTUSIASMO POR VOZ (Speech Sentiment)
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[1/4] Entrenando Detector de Entusiasmo e Interes del Comprador...")
    pitch_varianza_hz = np.random.uniform(15.0, 95.0, n_muestras)
    velocidad_habla_wpm = np.random.uniform(90.0, 190.0, n_muestras)
    tiempo_permanencia_seg = np.random.uniform(10.0, 180.0, n_muestras)
    n_preguntas_espaciales = np.random.randint(0, 6, n_muestras)

    # Nivel de interés alto (1) vs estándar (0)
    score_interes = (
        (pitch_varianza_hz / 95.0) * 0.35 +
        (tiempo_permanencia_seg / 180.0) * 0.35 +
        (n_preguntas_espaciales / 5.0) * 0.30 +
        np.random.normal(0, 0.05, n_muestras)
    )
    interes_alto = (score_interes >= 0.50).astype(int)

    X_int = np.column_stack([pitch_varianza_hz, velocidad_habla_wpm, tiempo_permanencia_seg, n_preguntas_espaciales])
    X_train_i, X_test_i, y_train_i, y_test_i = train_test_split(X_int, interes_alto, test_size=0.2, random_state=42)

    modelo_interes = GradientBoostingClassifier(n_estimators=100, learning_rate=0.08, max_depth=4, random_state=42)
    modelo_interes.fit(X_train_i, y_train_i)
    acc_int = accuracy_score(y_test_i, modelo_interes.predict(X_test_i))
    auc_int = roc_auc_score(y_test_i, modelo_interes.predict_proba(X_test_i)[:, 1])
    print(f" -> Precision Detector de Interes por Voz: {acc_int*100:.2f}% | AUC: {auc_int:.4f}")

    joblib.dump(modelo_interes, os.path.join(models_dir, 'buyer_interest_voice_detector.joblib'))

    # ─────────────────────────────────────────────────────────────────────────
    # MODELO 2: MANTENIMIENTO PREDICTIVO DE INSTALACIONES (Gemelo Digital)
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[2/4] Entrenando Motor de Mantenimiento Predictivo Inmobiliario...")
    antiguedad_inmueble_anios = np.random.uniform(0.5, 30.0, n_muestras)
    meses_desde_ultimo_mantenimiento = np.random.uniform(1.0, 48.0, n_muestras)
    uso_intensivo = np.random.choice([0, 1], n_muestras, p=[0.7, 0.3])
    calidad_materiales = np.random.choice([1, 2, 3], n_muestras, p=[0.2, 0.5, 0.3]) # 3=Premium

    # Meses estimados hasta requerir reparación o pintura
    meses_hasta_falla = (
        (calidad_materiales * 14.0) +
        (35.0 - antiguedad_inmueble_anios * 0.7) -
        (meses_desde_ultimo_mantenimiento * 0.5) -
        (uso_intensivo * 6.0) +
        np.random.normal(0, 2.0, n_muestras)
    )
    meses_hasta_falla = np.clip(np.round(meses_hasta_falla, 1), 1.0, 48.0)

    X_maint = np.column_stack([antiguedad_inmueble_anios, meses_desde_ultimo_mantenimiento, uso_intensivo, calidad_materiales])
    X_train_m, X_test_m, y_train_m, y_test_m = train_test_split(X_maint, meses_hasta_falla, test_size=0.2, random_state=42)

    modelo_maint = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42)
    modelo_maint.fit(X_train_m, y_train_m)
    r2_m = r2_score(y_test_m, modelo_maint.predict(X_test_m))
    print(f" -> Precision Mantenimiento Predictivo: R² = {r2_m:.4f} ({r2_m*100:.2f}%)")

    joblib.dump(modelo_maint, os.path.join(models_dir, 'predictive_maintenance_engine.joblib'))

    # ─────────────────────────────────────────────────────────────────────────
    # MODELO 3: LEAD CONVERSION & SCORING DE CIERRE COMERCIAL
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[3/4] Entrenando Predictor de Conversion de Leads y Cierre...")
    minutos_tour_virtual = np.random.uniform(1.0, 25.0, n_muestras)
    visito_360 = np.random.choice([0, 1], n_muestras, p=[0.3, 0.7])
    consulto_asistente_ia = np.random.choice([0, 1], n_muestras, p=[0.4, 0.6])
    descargo_contrato = np.random.choice([0, 1], n_muestras, p=[0.8, 0.2])

    prob_cierre = (
        (visito_360 * 0.30) +
        (consulto_asistente_ia * 0.25) +
        (descargo_contrato * 0.35) +
        (minutos_tour_virtual / 25.0) * 0.20 +
        np.random.normal(0, 0.04, n_muestras)
    )
    cierre_exitoso = (prob_cierre >= 0.48).astype(int)

    X_lead = np.column_stack([minutos_tour_virtual, visito_360, consulto_asistente_ia, descargo_contrato])
    X_train_l, X_test_l, y_train_l, y_test_l = train_test_split(X_lead, cierre_exitoso, test_size=0.2, random_state=42)

    modelo_lead = GradientBoostingClassifier(n_estimators=100, learning_rate=0.08, max_depth=4, random_state=42)
    modelo_lead.fit(X_train_l, y_train_l)
    acc_lead = accuracy_score(y_test_l, modelo_lead.predict(X_test_l))
    print(f" -> Precision Lead Scoring de Cierre: {acc_lead*100:.2f}%")

    joblib.dump(modelo_lead, os.path.join(models_dir, 'lead_conversion_scorer.joblib'))

    # ─────────────────────────────────────────────────────────────────────────
    # MODELO 4: MODULADOR DE TONO EMOCIONAL DE VOZ (TTS Tone Selector)
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[4/4] Entrenando Selector de Tono Emocional para Guia Virtual...")
    # Tono: 0=Cálido/Acogedor, 1=Informativo/Técnico, 2=Entusiasta/Venta
    tipo_ambiente_id = np.random.choice([0, 1, 2, 3], n_muestras) # 0=Suite, 1=Cocina/Servicios, 2=Terraza/Área social, 3=Ingreso
    precio_relativo_score = np.random.uniform(0.7, 1.3, n_muestras)
    
    tono_optimo = np.where(tipo_ambiente_id == 2, 2, np.where(tipo_ambiente_id == 1, 1, 0))

    X_tone = np.column_stack([tipo_ambiente_id, precio_relativo_score])
    X_train_t, X_test_t, y_train_t, y_test_t = train_test_split(X_tone, tono_optimo, test_size=0.2, random_state=42)

    modelo_tone = RandomForestClassifier(n_estimators=50, random_state=42)
    modelo_tone.fit(X_train_t, y_train_t)
    acc_tone = accuracy_score(y_test_t, modelo_tone.predict(X_test_t))
    print(f" -> Precision Modulador Emocional TTS: {acc_tone*100:.2f}%")

    joblib.dump(modelo_tone, os.path.join(models_dir, 'emotive_tts_tone_selector.joblib'))

    print("\n=================================================================")
    print("[SUCCESS] Todas las Fases del Plan Maestro de IA Entrenadas al 100%.")
    print("=================================================================")

if __name__ == '__main__':
    base_path = os.path.dirname(os.path.abspath(__file__))
    entrenar_suite_fases_3_y_4(base_path)
