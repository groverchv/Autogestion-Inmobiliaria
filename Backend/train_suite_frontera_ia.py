"""
Suite de Entrenamiento: Modelos de Frontera Tecnológica (Blockchain, Carbono, Depreciación e Iluminación Circadiana)
===================================================================================================================
Entrena los 4 modelos de vanguardia:
1. Validador de Integridad de Smart Contracts y Trazabilidad Blockchain
2. Estimador de Depreciación y Desgaste Físico de Mobiliario por Visión Artificial
3. Predictor de Huella de Carbono y Consumo Eléctrico Anual (kWh/m²)
4. Clasificador de Confort Psico-Visual e Iluminación Circadiana en Cuartos
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, r2_score

def entrenar_suite_frontera(base_dir: str):
    print("=================================================================")
    print("Iniciando Entrenamiento: Suite de Frontera Tecnológica (4 Modelos)")
    print("=================================================================")

    models_dir = os.path.join(base_dir, 'models_ml')
    os.makedirs(models_dir, exist_ok=True)

    np.random.seed(42)
    n_muestras = 1200

    # ─────────────────────────────────────────────────────────────────────────
    # MODELO 1: VALIDADOR DE SMART CONTRACTS & TRAZABILIDAD BLOCKCHAIN
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[1/4] Entrenando Validador de Smart Contracts & Integridad Blockchain...")
    n_transacciones = np.random.randint(1, 150, n_muestras)
    hash_previo_valido = np.random.choice([0, 1], n_muestras, p=[0.02, 0.98])
    firmas_validas = np.random.choice([0, 1], n_muestras, p=[0.01, 0.99])
    discrepancia_monto = np.random.choice([0, 1], n_muestras, p=[0.97, 0.03])

    contrato_integro = (
        (hash_previo_valido == 1) & (firmas_validas == 1) & (discrepancia_monto == 0)
    ).astype(int)

    X_bc = np.column_stack([n_transacciones, hash_previo_valido, firmas_validas, discrepancia_monto])
    X_train_b, X_test_b, y_train_b, y_test_b = train_test_split(X_bc, contrato_integro, test_size=0.2, random_state=42)

    modelo_bc = RandomForestClassifier(n_estimators=50, random_state=42)
    modelo_bc.fit(X_train_b, y_train_b)
    acc_bc = accuracy_score(y_test_b, modelo_bc.predict(X_test_b))
    print(f" -> Precision Validador Smart Contract: {acc_bc*100:.2f}%")

    joblib.dump(modelo_bc, os.path.join(models_dir, 'blockchain_contract_validator.joblib'))

    # ─────────────────────────────────────────────────────────────────────────
    # MODELO 2: ESTIMADOR DE DEPRECIACIÓN Y DESGASTE DE MOBILIARIO
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[2/4] Entrenando Estimador de Depreciacion de Mobiliario por Vision...")
    edad_mueble_meses = np.random.uniform(1.0, 72.0, n_muestras)
    horas_uso_diario = np.random.uniform(2.0, 14.0, n_muestras)
    calidad_material = np.random.choice([1, 2, 3], n_muestras) # 1=Económico, 2=Medio, 3=Madera maciza/Cuero
    score_desgaste_visual = np.random.uniform(0.1, 0.9, n_muestras) # Detectado por visión

    # Depreciación acumulada en porcentaje (0% a 85%)
    depreciacion_pct = (
        (edad_mueble_meses / 72.0) * 45.0 +
        (horas_uso_diario / 14.0) * 15.0 +
        (score_desgaste_visual * 25.0) -
        (calidad_material * 5.0) +
        np.random.normal(0, 1.5, n_muestras)
    )
    depreciacion_pct = np.clip(np.round(depreciacion_pct, 1), 0.0, 85.0)

    X_dep = np.column_stack([edad_mueble_meses, horas_uso_diario, calidad_material, score_desgaste_visual])
    X_train_d, X_test_d, y_train_d, y_test_d = train_test_split(X_dep, depreciacion_pct, test_size=0.2, random_state=42)

    modelo_dep = GradientBoostingRegressor(n_estimators=100, learning_rate=0.08, max_depth=4, random_state=42)
    modelo_dep.fit(X_train_d, y_train_d)
    r2_dep = r2_score(y_test_d, modelo_dep.predict(X_test_d))
    print(f" -> Precision Depreciacion de Activos: R² = {r2_dep:.4f} ({r2_dep*100:.2f}%)")

    joblib.dump(modelo_dep, os.path.join(models_dir, 'asset_depreciation_estimator.joblib'))

    # ─────────────────────────────────────────────────────────────────────────
    # MODELO 3: ESTIMADOR DE CONSUMO ELÉCTRICO Y HUELLA DE CARBONO (kWh/m²)
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[3/4] Entrenando Estimador de Consumo Electrico & Huella de Carbono...")
    superficie_m2 = np.random.uniform(40.0, 300.0, n_muestras)
    n_ocupantes = np.random.randint(1, 6, n_muestras)
    tiene_aire_acondicionado = np.random.choice([0, 1], n_muestras, p=[0.2, 0.8])
    eficiencia_luces_led = np.random.choice([0, 1], n_muestras, p=[0.3, 0.7])

    # Consumo anual estimado en kWh
    consumo_kwh_anual = (
        (superficie_m2 * 25.0) +
        (n_ocupantes * 650.0) +
        (tiene_aire_acondicionado * 1800.0) -
        (eficiencia_luces_led * 450.0) +
        np.random.normal(0, 120.0, n_muestras)
    )
    consumo_kwh_anual = np.clip(np.round(consumo_kwh_anual, -1), 800.0, 18000.0)

    X_carb = np.column_stack([superficie_m2, n_ocupantes, tiene_aire_acondicionado, eficiencia_luces_led])
    X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(X_carb, consumo_kwh_anual, test_size=0.2, random_state=42)

    modelo_carb = GradientBoostingRegressor(n_estimators=100, learning_rate=0.08, max_depth=4, random_state=42)
    modelo_carb.fit(X_train_c, y_train_c)
    r2_carb = r2_score(y_test_c, modelo_carb.predict(X_test_c))
    print(f" -> Precision Huella de Carbono & Consumo: R² = {r2_carb:.4f} ({r2_carb*100:.2f}%)")

    joblib.dump(modelo_carb, os.path.join(models_dir, 'carbon_footprint_predictor.joblib'))

    # ─────────────────────────────────────────────────────────────────────────
    # MODELO 4: CLASIFICADOR DE ILUMINACIÓN CIRCADIANO Y CONFORT PSICO-VISUAL
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[4/4] Entrenando Clasificador de Iluminacion Circadiana & Confort Psico-Visual...")
    temperatura_color_kelvin = np.random.uniform(2700, 6500, n_muestras) # 2700K (Cálido) a 6500K (Luz día)
    lux_nivel = np.random.uniform(100, 1000, n_muestras)
    tipo_cuarto = np.random.choice([0, 1, 2], n_muestras) # 0=Dormitorio, 1=Oficina/Estudio, 2=Sala

    # Confort circadiano óptimo (1) vs desbalanceado (0)
    # Dormitorio -> óptimo < 3500K y lux 150-300
    # Oficina -> óptimo > 4000K y lux 500-800
    confort_optimo = np.where(
        tipo_cuarto == 0,
        (temperatura_color_kelvin <= 3500) & (lux_nivel <= 350),
        np.where(
            tipo_cuarto == 1,
            (temperatura_color_kelvin >= 4000) & (lux_nivel >= 450),
            (temperatura_color_kelvin >= 3000) & (temperatura_color_kelvin <= 4500)
        )
    ).astype(int)

    X_circ = np.column_stack([temperatura_color_kelvin, lux_nivel, tipo_cuarto])
    X_train_cr, X_test_cr, y_train_cr, y_test_cr = train_test_split(X_circ, confort_optimo, test_size=0.2, random_state=42)

    modelo_circ = RandomForestClassifier(n_estimators=60, random_state=42)
    modelo_circ.fit(X_train_cr, y_train_cr)
    acc_circ = accuracy_score(y_test_cr, modelo_circ.predict(X_test_cr))
    print(f" -> Precision Confort Circadiano: {acc_circ*100:.2f}%")

    joblib.dump(modelo_circ, os.path.join(models_dir, 'circadian_lighting_scorer.joblib'))

    print("\n=================================================================")
    print("[SUCCESS] Suite de Frontera Tecnológica entrenada y serializada al 100%.")
    print("=================================================================")

if __name__ == '__main__':
    base_path = os.path.dirname(os.path.abspath(__file__))
    entrenar_suite_frontera(base_path)
