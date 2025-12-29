/**
 * Enhanced API client with automatic retry logic and error handling
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/**
 * Make an API call with automatic retry logic for server errors
 * @param {string} url - API endpoint URL (relative or absolute)
 * @param {Object} options - Fetch options
 * @param {number} options.retries - Number of retries for server errors (default: 2)
 * @returns {Promise<Object>} Response data
 */
export async function apiCall(url, options = {}) {
  const maxRetries = options.retries !== undefined ? options.retries : 2;
  const { retries: _retries, ...fetchOptions } = options;
  
  // Ensure URL is absolute
  const apiUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
      });
      
      // Handle non-OK responses
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: { message: response.statusText } };
        }
        
        // Server errors (5xx) should be retried
        if (response.status >= 500 && attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Throw structured error for client errors or exhausted retries
        throw {
          code: errorData.error?.code || 'API_ERROR',
          message: errorData.error?.message || `Request failed with status ${response.status}`,
          details: errorData.error?.details || null,
          status: response.status,
          timestamp: errorData.error?.timestamp || new Date().toISOString(),
        };
      }
      
      // Success - parse and return JSON
      const data = await response.json();
      return data;
      
    } catch (error) {
      // Network errors or parsing errors
      if (error.code && error.message) {
        // Already a structured error, just throw it
        if (attempt === maxRetries) {
          throw error;
        }
      } else {
        // Network error or other exception
        if (attempt === maxRetries) {
          throw {
            code: 'NETWORK_ERROR',
            message: error.message || 'Network request failed. Please check your connection.',
            details: null,
            status: 0,
            timestamp: new Date().toISOString(),
          };
        }
      }
      
      // Wait before retrying network errors
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * HTTP GET request
 */
export async function get(url, options = {}) {
  return apiCall(url, { ...options, method: 'GET' });
}

/**
 * HTTP POST request
 */
export async function post(url, data, options = {}) {
  return apiCall(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * HTTP PUT request
 */
export async function put(url, data, options = {}) {
  return apiCall(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * HTTP DELETE request
 */
export async function del(url, options = {}) {
  return apiCall(url, { ...options, method: 'DELETE' });
}

/**
 * HTTP PATCH request
 */
export async function patch(url, data, options = {}) {
  return apiCall(url, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export default {
  apiCall,
  get,
  post,
  put,
  delete: del,
  patch,
};
