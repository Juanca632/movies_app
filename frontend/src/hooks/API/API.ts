const URL = "http://localhost:8000"; 
// const URL = "https://moviesapp-production-8697.up.railway.app"; 

export const fetchData = async <T>(endpoint: string, timeout = 3000): Promise<T> => {
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
  
