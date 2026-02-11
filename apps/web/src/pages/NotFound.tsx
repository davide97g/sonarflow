import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="text-center">
        <h1
          className="mb-4 text-4xl font-bold text-white"
          style={{
            textShadow:
              "0 1px 3px rgba(0,0,0,0.9), 0 0 24px rgba(0,0,0,0.5)",
          }}
        >
          404
        </h1>
        <p
          className="mb-4 text-xl text-white/95"
          style={{
            textShadow:
              "0 1px 2px rgba(0,0,0,0.85), 0 0 12px rgba(0,0,0,0.4)",
          }}
        >
          Oops! Page not found
        </p>
        <a href="/" className="text-primary underline hover:text-primary/80">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
