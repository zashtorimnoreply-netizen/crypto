/**
 * Chart Data Downsampling Utility
 * Reduces large datasets for performance while preserving visual accuracy
 */

/**
 * Downsample data using Largest Triangle Three Buckets (LTTB) algorithm
 * This preserves visual peaks and valleys better than simple decimation
 * @param {object[]} data - Array of data points with timestamp/value
 * @param {number} targetPoints - Maximum number of points to return
 * @param {string} valueKey - Key for the value field (default: 'total_value')
 * @returns {object[]} Downsampled data
 */
export function downsampleLTTB(data, targetPoints, valueKey = 'total_value') {
  if (!data || data.length <= targetPoints) {
    return data;
  }

  const dataLength = data.length;
  const sampled = [];

  // Bucket size. Leave room for start and end data points
  let bucketSize = (dataLength - 2) / (targetPoints - 2);

  sampled.push(data[0]); // Always include first point

  for (let i = 0; i < targetPoints - 2; i++) {
    // Calculate bucket range
    let bucketStart = Math.floor((i + 1) * bucketSize) + 1;
    let bucketEnd = Math.floor((i + 2) * bucketSize) + 1;
    bucketEnd = bucketEnd > dataLength ? dataLength : bucketEnd;

    // Get average point for next bucket
    let nextBucketAvg = getAverage(data, bucketStart, bucketEnd, valueKey);

    // Get range for current bucket
    let prevBucketStart = Math.floor(i * bucketSize) + 1;
    let prevBucketEnd = Math.floor((i + 1) * bucketSize) + 1;

    // Point that maximizes the triangle area
    let maxArea = -1;
    let maxAreaIndex = prevBucketStart;

    for (let j = prevBucketStart; j < prevBucketEnd; j++) {
      const area = calculateTriangleArea(
        data[sampled.length - 1], // Previous point
        data[j], // Candidate point
        nextBucketAvg, // Average of next bucket
        valueKey
      );
      if (area > maxArea) {
        maxArea = area;
        maxAreaIndex = j;
      }
    }

    sampled.push(data[maxAreaIndex]);
  }

  sampled.push(data[dataLength - 1]); // Always include last point

  return sampled;
}

/**
 * Get average value of points in a range
 */
function getAverage(data, start, end, valueKey) {
  let sum = 0;
  let count = 0;
  for (let i = start; i < end; i++) {
    sum += data[i][valueKey] || 0;
    count++;
  }
  return { [valueKey]: sum / count };
}

/**
 * Calculate triangle area for LTTB algorithm
 */
function calculateTriangleArea(p1, p2, p3, valueKey) {
  return Math.abs(
    (p1.timestamp * (p2[valueKey] - p3[valueKey]) +
      p2.timestamp * (p3[valueKey] - p1[valueKey]) +
      p3.timestamp * (p1[valueKey] - p2[valueKey])) / 2
  );
}

/**
 * Simple decimation - keep every nth point
 * Faster but less accurate for preserving visual features
 * @param {object[]} data - Array of data points
 * @param {number} targetPoints - Maximum number of points
 * @returns {object[]} Downsampled data
 */
export function downsampleDecimate(data, targetPoints) {
  if (!data || data.length <= targetPoints) {
    return data;
  }

  const step = Math.ceil(data.length / targetPoints);
  return data.filter((_, index) => index % step === 0 || index === data.length - 1);
}

/**
 * Get optimal downsampling method based on data size
 * @param {number} dataLength - Number of data points
 * @returns {object} Downsampling configuration
 */
export function getDownsampleConfig(dataLength) {
  if (dataLength <= 100) {
    return { method: null, reason: 'Data small enough - no downsampling needed' };
  } else if (dataLength <= 500) {
    return { method: null, reason: 'Data manageable - no downsampling needed' };
  } else if (dataLength <= 1000) {
    return { method: downsampleLTTB, targetPoints: 500, reason: 'LTTB for 500+ points' };
  } else {
    return { method: downsampleLTTB, targetPoints: 300, reason: 'Aggressive LTTB for 1000+ points' };
  }
}

/**
 * Apply downsampling to equity curve data
 * Uses automatic downsampling based on data size
 * @param {object[]} data - Equity curve data array
 * @returns {object[]} Downsampled data
 */
export function downsampleEquityCurve(data) {
  if (!data || data.length === 0) {
    return data;
  }

  const config = getDownsampleConfig(data.length);
  
  if (!config.method) {
    return data;
  }

  console.log(`Downsampling: ${data.length} points -> ${config.targetPoints} points (${config.reason})`);
  
  return config.method(data, config.targetPoints);
}

export default {
  downsampleLTTB,
  downsampleDecimate,
  downsampleEquityCurve,
  getDownsampleConfig,
};
