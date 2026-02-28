"""
Productivity Pattern Analyzer

Uses scikit-learn to identify optimal study patterns:
- Best study partners (collaborative filtering)
- Optimal session times (time-series regression)
- Focus score prediction based on context features
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score
from typing import List, Optional
import joblib
from datetime import datetime
from pathlib import Path

MODEL_PATH = Path(__file__).parent / "models"
MODEL_PATH.mkdir(exist_ok=True)


class ProductivityAnalyzer:
    def __init__(self):
        self.model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            random_state=42,
        )
        self.scaler = StandardScaler()
        self.is_fitted = False

    def prepare_features(self, sessions_data: List[dict]) -> pd.DataFrame:
        """
        Extract features from raw session data.

        Expected dict keys:
            - hour_of_day: int (0-23)
            - day_of_week: int (0=Mon, 6=Sun)
            - group_size: int
            - session_duration_minutes: float
            - partner_ids: list[int]
            - user_avg_score_last_5: float
            - is_morning: bool (derived)
        """
        records = []
        for s in sessions_data:
            hour = s.get("hour_of_day", 12)
            records.append({
                "hour_of_day": hour,
                "hour_sin": np.sin(2 * np.pi * hour / 24),
                "hour_cos": np.cos(2 * np.pi * hour / 24),
                "day_of_week": s.get("day_of_week", 0),
                "is_weekend": 1 if s.get("day_of_week", 0) >= 5 else 0,
                "group_size": s.get("group_size", 1),
                "is_solo": 1 if s.get("group_size", 1) == 1 else 0,
                "session_duration_minutes": s.get("session_duration_minutes", 30),
                "user_avg_score_last_5": s.get("user_avg_score_last_5", 70),
                "num_unique_partners": len(set(s.get("partner_ids", []))),
            })
        return pd.DataFrame(records)

    def train(self, sessions_data: List[dict], focus_scores: List[float]) -> dict:
        if len(sessions_data) < 5:
            return {"error": "Need at least 5 sessions to train", "sessions_count": len(sessions_data)}

        X = self.prepare_features(sessions_data)
        y = np.array(focus_scores)

        self.scaler.fit(X)
        X_scaled = self.scaler.transform(X)

        self.model.fit(X_scaled, y)
        self.is_fitted = True

        cv_scores = cross_val_score(self.model, X_scaled, y, cv=min(5, len(y)), scoring="r2")

        feature_importance = dict(zip(X.columns, self.model.feature_importances_))

        joblib.dump(self.model, MODEL_PATH / "productivity_model.pkl")
        joblib.dump(self.scaler, MODEL_PATH / "scaler.pkl")

        return {
            "r2_score": float(np.mean(cv_scores)),
            "feature_importance": {k: round(float(v), 4) for k, v in
                                   sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)},
            "sessions_trained_on": len(sessions_data),
        }

    def predict_focus_score(self, session_context: dict) -> float:
        if not self.is_fitted:
            return 70.0

        X = self.prepare_features([session_context])
        X_scaled = self.scaler.transform(X)
        prediction = self.model.predict(X_scaled)[0]
        return float(np.clip(prediction, 0, 100))

    def get_recommendations(self, user_sessions: List[dict], user_scores: List[float]) -> List[dict]:
        if len(user_sessions) < 5:
            return [{"type": "general", "message": "Complete more sessions to unlock personalized insights!"}]

        self.train(user_sessions, user_scores)
        recommendations = []

        morning_sessions = [s for s in user_sessions if s.get("hour_of_day", 12) < 12]
        afternoon_sessions = [s for s in user_sessions if 12 <= s.get("hour_of_day", 12) < 18]
        evening_sessions = [s for s in user_sessions if s.get("hour_of_day", 12) >= 18]

        morning_avg = np.mean([user_scores[i] for i, s in enumerate(user_sessions) if s.get("hour_of_day", 12) < 12]) if morning_sessions else 0
        afternoon_avg = np.mean([user_scores[i] for i, s in enumerate(user_sessions) if 12 <= s.get("hour_of_day", 12) < 18]) if afternoon_sessions else 0
        evening_avg = np.mean([user_scores[i] for i, s in enumerate(user_sessions) if s.get("hour_of_day", 12) >= 18]) if evening_sessions else 0

        best_time = max(
            [("morning", morning_avg), ("afternoon", afternoon_avg), ("evening", evening_avg)],
            key=lambda x: x[1],
        )
        if best_time[1] > 0:
            uplift = round(best_time[1] - np.mean(user_scores), 1)
            if uplift > 3:
                recommendations.append({
                    "type": "optimal_time",
                    "message": f"You focus {uplift}% better in {best_time[0]} sessions. Try scheduling more study time then!",
                    "data": {"best_period": best_time[0], "uplift_percent": uplift},
                })

        solo_scores = [user_scores[i] for i, s in enumerate(user_sessions) if s.get("group_size", 1) == 1]
        group_scores = [user_scores[i] for i, s in enumerate(user_sessions) if s.get("group_size", 1) > 1]

        if solo_scores and group_scores:
            solo_avg = np.mean(solo_scores)
            group_avg = np.mean(group_scores)
            diff = round(group_avg - solo_avg, 1)
            if diff > 5:
                recommendations.append({
                    "type": "social_boost",
                    "message": f"You focus {diff}% better in squad sessions vs. solo. Study with friends more!",
                    "data": {"solo_avg": round(solo_avg, 1), "group_avg": round(group_avg, 1), "uplift": diff},
                })

        group_sizes = {}
        for i, s in enumerate(user_sessions):
            size = s.get("group_size", 1)
            if size not in group_sizes:
                group_sizes[size] = []
            group_sizes[size].append(user_scores[i])

        if len(group_sizes) > 1:
            best_size = max(group_sizes.items(), key=lambda x: np.mean(x[1]))
            if len(best_size[1]) >= 2:
                recommendations.append({
                    "type": "optimal_group_size",
                    "message": f"Your sweet spot is groups of {best_size[0]}. Average focus: {np.mean(best_size[1]):.0f}%.",
                    "data": {"optimal_size": best_size[0], "avg_score": round(np.mean(best_size[1]), 1)},
                })

        partner_scores: dict[int, list] = {}
        for i, s in enumerate(user_sessions):
            for pid in s.get("partner_ids", []):
                if pid not in partner_scores:
                    partner_scores[pid] = []
                partner_scores[pid].append(user_scores[i])

        if partner_scores:
            best_partner = max(partner_scores.items(), key=lambda x: np.mean(x[1]) if len(x[1]) >= 2 else 0)
            if len(best_partner[1]) >= 2:
                avg = np.mean(best_partner[1])
                recommendations.append({
                    "type": "best_partner",
                    "message": f"You focus best when studying with partner #{best_partner[0]}. Average: {avg:.0f}%.",
                    "data": {"partner_id": best_partner[0], "avg_score": round(avg, 1), "sessions_together": len(best_partner[1])},
                })

        if not recommendations:
            recommendations.append({
                "type": "general",
                "message": "You're building great study habits! Keep experimenting with different times and group sizes.",
            })

        return recommendations

    def load_model(self) -> bool:
        model_file = MODEL_PATH / "productivity_model.pkl"
        scaler_file = MODEL_PATH / "scaler.pkl"
        if model_file.exists() and scaler_file.exists():
            self.model = joblib.load(model_file)
            self.scaler = joblib.load(scaler_file)
            self.is_fitted = True
            return True
        return False


analyzer = ProductivityAnalyzer()
