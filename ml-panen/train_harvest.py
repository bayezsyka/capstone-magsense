import os
import json
import numpy as np
import pandas as pd
import xgboost as xgb

def train_harvest_model(output_path='model/harvest.json', num_samples=10000):
    np.random.seed(42)
    N = num_samples

    suhu = np.random.uniform(25.0, 36.0, N)
    rh_udara = np.random.uniform(50.0, 90.0, N)
    soil_adc = np.random.uniform(1800.0, 3600.0, N)

    scenario = np.random.choice(
        ['early', 'mid', 'harvest_ready', 'late', 'mixed'],
        size=N,
        p=[0.25, 0.35, 0.25, 0.05, 0.10]
    )

    baby = np.zeros(N)
    adult = np.zeros(N)
    prepupa = np.zeros(N)
    pupa = np.zeros(N)

    for i in range(N):
        sc = scenario[i]
        if sc == 'early':
            baby[i] = np.random.randint(40, 150)
            adult[i] = np.random.randint(0, 30)
            prepupa[i] = 0
            pupa[i] = 0
        elif sc == 'mid':
            baby[i] = np.random.randint(5, 40)
            adult[i] = np.random.randint(60, 250)
            prepupa[i] = np.random.randint(0, 15)
            pupa[i] = 0
        elif sc == 'harvest_ready':
            baby[i] = np.random.randint(0, 10)
            adult[i] = np.random.randint(10, 60)
            prepupa[i] = np.random.randint(40, 120)
            pupa[i] = np.random.randint(0, 10)
        elif sc == 'late':
            baby[i] = 0
            adult[i] = np.random.randint(0, 15)
            prepupa[i] = np.random.randint(10, 40)
            pupa[i] = np.random.randint(30, 80)
        else:
            baby[i] = np.random.randint(10, 60)
            adult[i] = np.random.randint(20, 100)
            prepupa[i] = np.random.randint(5, 30)
            pupa[i] = np.random.randint(0, 10)

    tot = baby + adult + prepupa + pupa
    tot = np.maximum(tot, 1.0)

    mat_idx = (0.05 * baby + 0.50 * adult + 0.90 * prepupa + 1.0 * pupa) / tot
    base_days = 16.0 * (1.0 - mat_idx)

    temp_penalty = np.where(suhu < 27.0, (27.0 - suhu) * 0.4, 0.0) + np.where(suhu > 33.0, (suhu - 33.0) * 0.3, 0.0)
    soil_penalty = np.where(soil_adc > 3200.0, 0.8, 0.0)
    noise = np.random.normal(0, 0.4, N)

    hari_menuju_panen = np.clip(base_days + temp_penalty + soil_penalty + noise, 0.0, 18.0)

    FITUR = [
        'suhu_udara_c', 'kelembapan_udara_pct', 'kelembapan_media_adc',
        'jumlah_baby_larva', 'jumlah_adult_larva', 'jumlah_prepupa', 'jumlah_pupa'
    ]

    df = pd.DataFrame({
        'suhu_udara_c': suhu,
        'kelembapan_udara_pct': rh_udara,
        'kelembapan_media_adc': soil_adc,
        'jumlah_baby_larva': baby,
        'jumlah_adult_larva': adult,
        'jumlah_prepupa': prepupa,
        'jumlah_pupa': pupa,
        'hari_menuju_panen': hari_menuju_panen
    })

    X = df[FITUR]
    y = df['hari_menuju_panen']

    model = xgb.XGBRegressor(
        n_estimators=150,
        learning_rate=0.08,
        max_depth=4,
        random_state=42
    )
    model.fit(X, y)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    model.save_model(output_path)
    print(f'Model trained and saved to {output_path}')
    print(f'Feature names: {model.get_booster().feature_names}')

if __name__ == '__main__':
    train_harvest_model()
