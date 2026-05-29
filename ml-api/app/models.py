"""
Model loader for Spendly ML API.

Both models share the same 12 feature columns (in this exact order):
    ['amount', 'week_of_month', 'day_of_month', 'month_budget', 'daily_budget',
     'cum_expense_daily', 'cum_expense_monthly', 'current_budget', 'spending_ratio',
     'trx_frequency', 'rolling_avg_7d', 'expense_acceleration']

Classifier  — input: (batch, 12)    → output: (batch, 3) softmax [aman, hati_hati, boros]
LSTM        — input: (batch, 7, 12) → output: (batch, 1) next_month_expense_norm (ratio)

Denormalization: predicted_amount = norm_pred * month_budget

Label map: {0: 'AMAN', 1: 'HATI-HATI', 2: 'BOROS'}
"""
from pathlib import Path

import joblib
import numpy as np

# ─────────────────────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────────────────────
_ML_API_ROOT = Path(__file__).resolve().parent.parent
_MODELS_DIR = _ML_API_ROOT / "models"
_LSTM_PATH = _MODELS_DIR / "spendly_LSTM.keras"
_CLASSIFIER_PATH = _MODELS_DIR / "spendly_classifier.keras"
_SCALER_LSTM_PATH = _MODELS_DIR / "scaler_lstm.pkl"
_SCALER_CLF_PATH = _MODELS_DIR / "scaler_classification.pkl"

# ─────────────────────────────────────────────────────────────────────────────
# Feature columns — MUST match training order exactly (12 features)
# ─────────────────────────────────────────────────────────────────────────────
FEATURE_COLS = [
    "amount",
    "week_of_month",
    "day_of_month",
    "month_budget",
    "daily_budget",
    "cum_expense_daily",
    "cum_expense_monthly",
    "current_budget",
    "spending_ratio",
    "trx_frequency",
    "rolling_avg_7d",
    "expense_acceleration",
]

LSTM_WINDOW = 7  # sliding window size

# Label map matching training: {0: aman, 1: hati_hati, 2: boros}
LABEL_MAP = {0: "AMAN", 1: "HATI-HATI", 2: "BOROS"}

# ─────────────────────────────────────────────────────────────────────────────
# Lazy-loaded singletons
# ─────────────────────────────────────────────────────────────────────────────
_lstm_model = None
_classifier_model = None
_scaler_lstm = None
_scaler_clf = None


def _load_keras():
    import keras
    return keras


def _register_custom_layers():
    """
    Re-register AttentionLayer so Keras can deserialize the classifier model.
    """
    import keras
    import keras.ops as ops

    @keras.saving.register_keras_serializable()
    class AttentionLayer(keras.layers.Layer):
        def __init__(self, units: int = 32, **kwargs):
            super().__init__(**kwargs)
            self.units = units

        def build(self, input_shape):
            self.W = self.add_weight(
                name="att_W",
                shape=(input_shape[-1], self.units),
                initializer="glorot_uniform",
                trainable=True,
            )
            self.b = self.add_weight(
                name="att_b",
                shape=(self.units,),
                initializer="zeros",
                trainable=True,
            )
            self.u = self.add_weight(
                name="att_u",
                shape=(self.units,),
                initializer="glorot_uniform",
                trainable=True,
            )
            super().build(input_shape)

        def call(self, inputs):
            scores = ops.tanh(ops.matmul(inputs, self.W) + self.b)
            attention_weights = ops.softmax(
                ops.sum(scores * self.u, axis=-1, keepdims=True), axis=1
            )
            return inputs * attention_weights

        def get_config(self):
            config = super().get_config()
            config.update({"units": self.units})
            return config

    return {"AttentionLayer": AttentionLayer}


def get_lstm_model():
    global _lstm_model
    if _lstm_model is None:
        keras = _load_keras()
        if not _LSTM_PATH.exists():
            raise FileNotFoundError(f"LSTM model not found at {_LSTM_PATH}")
        _lstm_model = keras.models.load_model(str(_LSTM_PATH))
    return _lstm_model


def get_classifier_model():
    global _classifier_model
    if _classifier_model is None:
        keras = _load_keras()
        custom_objects = _register_custom_layers()
        if not _CLASSIFIER_PATH.exists():
            raise FileNotFoundError(f"Classifier model not found at {_CLASSIFIER_PATH}")
        _classifier_model = keras.models.load_model(
            str(_CLASSIFIER_PATH), custom_objects=custom_objects, compile=False
        )
    return _classifier_model


def get_scaler_lstm():
    global _scaler_lstm
    if _scaler_lstm is None:
        if not _SCALER_LSTM_PATH.exists():
            raise FileNotFoundError(f"LSTM scaler not found at {_SCALER_LSTM_PATH}")
        _scaler_lstm = joblib.load(str(_SCALER_LSTM_PATH))
    return _scaler_lstm


def get_scaler_clf():
    global _scaler_clf
    if _scaler_clf is None:
        if not _SCALER_CLF_PATH.exists():
            raise FileNotFoundError(f"Classifier scaler not found at {_SCALER_CLF_PATH}")
        _scaler_clf = joblib.load(str(_SCALER_CLF_PATH))
    return _scaler_clf


# ─────────────────────────────────────────────────────────────────────────────
# Public inference functions
# ─────────────────────────────────────────────────────────────────────────────

def predict_spending(sequence: list[dict]) -> float:
    """
    Predict next month's expense using the LSTM model.

    Args:
        sequence: List of exactly 7 dicts, each containing all FEATURE_COLS keys.
                  Represents the 7 most recent days (oldest → newest).

    Returns:
        Predicted next-month expense in IDR.
        Model output is next_month_expense / month_budget (ratio),
        so we multiply by the last window's month_budget.
    """
    if len(sequence) != LSTM_WINDOW:
        raise ValueError(f"LSTM requires exactly {LSTM_WINDOW} timesteps, got {len(sequence)}")

    model = get_lstm_model()
    scaler = get_scaler_lstm()

    X = np.array(
        [[row[col] for col in FEATURE_COLS] for row in sequence],
        dtype=np.float32,
    )  # shape: (7, 12)

    X_2d = X.reshape(-1, len(FEATURE_COLS))
    X_scaled_2d = scaler.transform(X_2d)
    X_scaled = X_scaled_2d.reshape(1, LSTM_WINDOW, len(FEATURE_COLS))  # (1, 7, 12)

    norm_pred = float(model.predict(X_scaled, verbose=0)[0][0])

    month_budget = sequence[-1]["month_budget"]
    predicted_amount = norm_pred * month_budget

    return max(1.0, predicted_amount)


def predict_status(features: dict) -> tuple[str, float]:
    """
    Classify financial status from a single transaction's features.

    Returns:
        (status, confidence) where status is one of 'AMAN', 'HATI-HATI', 'BOROS'
    """
    model = get_classifier_model()
    scaler = get_scaler_clf()

    X = np.array(
        [[features[col] for col in FEATURE_COLS]],
        dtype=np.float32,
    )  # shape: (1, 12)

    X_scaled = scaler.transform(X)

    probs = model.predict(X_scaled, verbose=0)[0]  # shape: (3,)
    class_idx = int(np.argmax(probs))
    confidence = float(probs[class_idx])

    return LABEL_MAP[class_idx], round(min(max(confidence, 0.0), 1.0), 4)
