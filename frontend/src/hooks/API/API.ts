const PROTOCOL = window.location.protocol;
const API_HOST = window.location.hostname;

const isLocal = API_HOST === 'localhost' || API_HOST === '127.0.0.1';

// VITE_API_URL wins; otherwise talk to the local backend in dev and to the reverse proxy in prod.
const URL: string = import.meta.env.VITE_API_URL
  ?? (isLocal ? `${PROTOCOL}//${API_HOST}:8000/api/v1` : `/api/v1`);

export const fetchData = async <T>(endpoint: string, timeout = 10000): Promise<T> => {
    const controller = new AbortController();
    const signal = controller.signal;
  
    const timeoutId = setTimeout(() => controller.abort(), timeout);
  
    try {
      const response = await fetch(`${URL}/${endpoint}`, { signal });
  
      clearTimeout(timeoutId);
  
      if (!response.ok) {
        throw new Error(`Error fetching data from ${endpoint}: ${response.statusText}`);
      }
  
      return await response.json();
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.error("Request timed out");
        throw new Error("The request timed out. The server may be down.");
      }
      if (error instanceof Error) {
        console.error("Failed to fetch data:", error.message);
        throw new Error(`Failed to fetch data: ${error.message}`);
      }
      throw new Error("An unknown error occurred while fetching data.");
    }
  };
  

export interface Page<T> {
  page: number;
  total_pages: number;
  total_results: number;
  results: T[];
}

/** Fetch a paginated endpoint and return only its items. */
export const fetchList = async <T>(endpoint: string): Promise<T[]> =>
  (await fetchData<Page<T>>(endpoint)).results;
