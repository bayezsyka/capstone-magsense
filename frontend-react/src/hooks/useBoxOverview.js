import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGlobalContext } from '../context/useGlobalContext';
import useWebSocket from './useWebSocket';
import {
  getAllBoxes,
  getDashboardSummary,
  getAllHarvestPredictions,
  getAllCvResults,
  getAllSensorData
} from '../services/api';

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '--';
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(1) : String(value);
};

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const buildLatestMap = (rows) => {
  const map = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (!row?.box_id || map.has(row.box_id)) return;
    map.set(row.box_id, row);
  });
  return map;
};

const matchesTenant = (box, user) => {
  if (!user) return true;
  const role = String(user.role || '').toLowerCase();
  if (role === 'admin') return true;
  if (!user.tenant_id) return true;
  return box.tenant_id === user.tenant_id;
};

const buildCards = (raw, user) => {
  const boxes = (Array.isArray(raw.boxes) ? raw.boxes : [])
    .filter((box) => box && box.is_active !== false)
    .filter((box) => matchesTenant(box, user));

  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';
  const summaryBoxes = Array.isArray(raw.summary?.boxes) ? raw.summary.boxes : [];
  const summaryByName = new Map(summaryBoxes.map((box) => [box.name, box]));

  const latestPredictionByBox = buildLatestMap(raw.predictions);
  const latestCvByBox = buildLatestMap(raw.cvResults);
  const latestSensorByBox = buildLatestMap(raw.sensorRows);

  return boxes
    .slice()
    .sort((a, b) => {
      const left = Number(a.box_number ?? Number.MAX_SAFE_INTEGER);
      const right = Number(b.box_number ?? Number.MAX_SAFE_INTEGER);
      if (left !== right) return left - right;
      return String(a.name || '').localeCompare(String(b.name || ''));
    })
    .map((box, index) => {
      const number = box.box_number ?? index + 1;
      const summaryBox = summaryByName.get(box.name) || null;
      const latestSensor = latestSensorByBox.get(box.id) || {};
      const isPrimary = isAdmin
        && Boolean(summaryBox)
        && String(raw.summary?.currentBox?.id ?? '') === String(number);
      const liveBox = isPrimary ? (raw.summary?.currentBox || {}) : {};
      const prediction = latestPredictionByBox.get(box.id) || null;
      const cv = latestCvByBox.get(box.id) || null;
      const summaryPrediction = isPrimary ? (raw.summary?.harvestPrediction || null) : null;
      const summaryCv = isPrimary ? (raw.summary?.cvAnalysis || null) : null;
      const fallbackCounts = summaryCv?.detectionCounts || {};
      const cvCounts = cv || fallbackCounts;
      const totalDetected = cv?.total_detected ?? (
        Number(cvCounts.baby_larva || 0)
        + Number(cvCounts.adult_larva || 0)
        + Number(cvCounts.prepupa || 0)
        + Number(cvCounts.pupa || 0)
      );
      const days = toNumber(prediction?.estimated_days ?? summaryPrediction?.estimatedDays);
      const dominantPhase = cv?.dominant_phase || summaryCv?.dominantPhase || null;

      return {
        uuid: box.id,
        tenantId: box.tenant_id,
        number,
        name: box.name || `Box ${number}`,
        isActive: box.is_active !== false,
        temp: formatValue(latestSensor.air_temp ?? summaryBox?.temp ?? liveBox.airTemp),
        humidity: formatValue(latestSensor.air_humidity ?? summaryBox?.humidity ?? liveBox.airHumidity),
        mediaHumidity: formatValue(latestSensor.media_humidity ?? liveBox.mediaHumidity),
        rawSoilAdc: latestSensor.raw_soil_adc ?? liveBox.rawSoilAdc ?? null,
        source: latestSensor.source ?? summaryBox?.source ?? liveBox.source ?? null,
        timestamp: latestSensor.timestamp ?? summaryBox?.timestamp ?? null,
        days,
        urgency: prediction?.urgency_level || summaryPrediction?.urgencyLevel || null,
        predictionSource: prediction?.source || summaryPrediction?.source || null,
        predictionTimestamp: prediction?.timestamp || null,
        dominantPhase,
        totalDetected,
        hasCv: Boolean(cv || summaryCv),
        hasPrediction: Boolean(prediction || (summaryPrediction && days !== null))
      };
    });
};

const mergeRealtime = (cards, realtimeData) => {
  if (!realtimeData) return cards;
  const readings = Array.isArray(realtimeData) ? realtimeData : [realtimeData];
  if (readings.length === 0) return cards;

  return cards.map((card) => {
    const reading = readings.find((item) => {
      if (!item?.box_id) return false;
      return String(item.box_id) === String(card.uuid)
        || String(item.box_id) === String(card.number);
    });
    if (!reading) return card;

    return {
      ...card,
      temp: reading.air_temp !== undefined ? formatValue(reading.air_temp) : card.temp,
      humidity: reading.air_humidity !== undefined ? formatValue(reading.air_humidity) : card.humidity,
      mediaHumidity: reading.media_humidity !== undefined ? formatValue(reading.media_humidity) : card.mediaHumidity,
      rawSoilAdc: reading.raw_soil_adc ?? card.rawSoilAdc,
      source: reading.source || card.source,
      timestamp: reading.timestamp || card.timestamp
    };
  });
};

export default function useBoxOverview({
  includePrediction = false,
  includeCv = false,
  includeSensorData = false,
  pollMs = 10000
} = {}) {
  const { user, refreshVersion } = useGlobalContext();
  const { realtimeData } = useWebSocket();
  const mountedRef = useRef(true);
  const lastRefreshRef = useRef(0);
  const isFetchingRef = useRef(false);

  const [raw, setRaw] = useState({
    boxes: [],
    summary: null,
    predictions: [],
    cvResults: [],
    sensorRows: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (!silent) setIsLoading(true);
    let boxesError = null;

    try {
      const [boxes, summary, predictions, cvResults, sensorRows] = await Promise.all([
        getAllBoxes().catch((err) => {
          boxesError = err;
          return [];
        }),
        getDashboardSummary().catch(() => null),
        includePrediction ? getAllHarvestPredictions({ latest_per_box: true }).catch(() => []) : Promise.resolve([]),
        includeCv ? getAllCvResults({ latest_per_box: true }).catch(() => []) : Promise.resolve([]),
        includeSensorData ? getAllSensorData({ latest_per_box: true }).catch(() => []) : Promise.resolve([])
      ]);

      if (!mountedRef.current) return;

      setRaw({
        boxes: Array.isArray(boxes) ? boxes : [],
        summary,
        predictions: Array.isArray(predictions) ? predictions : [],
        cvResults: Array.isArray(cvResults) ? cvResults : [],
        sensorRows: Array.isArray(sensorRows) ? sensorRows : []
      });
      setError(boxesError);
    } finally {
      isFetchingRef.current = false;
      if (mountedRef.current) setIsLoading(false);
    }
  }, [includePrediction, includeCv, includeSensorData]);

  useEffect(() => {
    // Data loading intentionally updates state after the asynchronous request.
    // oxlint-disable-next-line react/set-state-in-effect
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!pollMs) return undefined;
    const interval = setInterval(() => {
      fetchData({ silent: true });
    }, pollMs);
    return () => clearInterval(interval);
  }, [fetchData, pollMs]);

  useEffect(() => {
    if (!refreshVersion) return undefined;
    const timer = setTimeout(() => {
      fetchData({ silent: true });
    }, 400);
    return () => clearTimeout(timer);
  }, [refreshVersion, fetchData]);

  useEffect(() => {
    const refresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastRefreshRef.current < 1500) return;
      lastRefreshRef.current = now;
      fetchData({ silent: true });
    };

    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [fetchData]);

  const cards = useMemo(() => {
    return mergeRealtime(buildCards(raw, user), realtimeData);
  }, [raw, user, realtimeData]);

  const refresh = useCallback(() => fetchData({ silent: true }), [fetchData]);

  return {
    cards,
    summary: raw.summary,
    isLoading,
    error,
    refresh
  };
}
