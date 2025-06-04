// const URL = "http://82.25.115.237:8000"; 
// const URL = "http://localhost:8000"; 
// const URL = "https://movies-app-backend-gd78.onrender.com"; 

const PROTOCOL = window.location.protocol; 
const API_HOST = window.location.hostname;

const isLocal = API_HOST === 'localhost' || API_HOST === '127.0.0.1';

const URL = isLocal 
  ? `${PROTOCOL}//${API_HOST}:8000`  
  : `/api`;  

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
  
