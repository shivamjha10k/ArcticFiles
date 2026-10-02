"""
Climate Change Data Analysis Module

This module provides tools for analyzing climate change datasets,
including temperature anomalies, sea level rise, and CO2 concentrations.
"""

import json
from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class ClimateRecord:
    """Represents a single climate measurement record."""
    year: int
    temperature_anomaly: float  # degrees Celsius relative to baseline
    co2_concentration: float    # parts per million
    sea_level_change: float     # millimeters relative to baseline
    region: str


def calculate_trend(records: List[ClimateRecord]) -> Dict[str, float]:
    """
    Calculate the linear trend of climate indicators.
    
    Args:
        records: List of ClimateRecord objects sorted by year
        
    Returns:
        Dictionary with trend values per decade for each indicator
    """
    if len(records) < 2:
        return {"error": "Need at least 2 records for trend calculation"}
    
    years = [r.year for r in records]
    temps = [r.temperature_anomaly for r in records]
    
    n = len(years)
    year_range = years[-1] - years[0]
    
    temp_trend = (temps[-1] - temps[0]) / year_range * 10  # per decade
    
    return {
        "temperature_trend_per_decade": round(temp_trend, 3),
        "period_start": years[0],
        "period_end": years[-1],
        "total_warming": round(temps[-1] - temps[0], 3)
    }


def identify_extreme_events(records: List[ClimateRecord], 
                           threshold: float = 2.0) -> List[ClimateRecord]:
    """
    Identify years with extreme temperature anomalies.
    
    Args:
        records: List of climate records
        threshold: Standard deviations from mean to consider extreme
    """
    if not records:
        return []
    
    mean_temp = sum(r.temperature_anomaly for r in records) / len(records)
    variance = sum((r.temperature_anomaly - mean_temp) ** 2 for r in records) / len(records)
    std_dev = variance ** 0.5
    
    return [r for r in records if abs(r.temperature_anomaly - mean_temp) > threshold * std_dev]
