import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const useHomeScrollRestoration = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== "/") return; 

    const savedScrollPosition = sessionStorage.getItem("homeScroll");
    if (savedScrollPosition) {
      window.scrollTo(0, parseInt(savedScrollPosition));
      sessionStorage.removeItem("homeScroll");
    }

    const handleBeforeUnload = () => {
      sessionStorage.setItem("homeScroll", window.scrollY.toString());
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [location]);
};

export default useHomeScrollRestoration;
