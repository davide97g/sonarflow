import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Landing = () => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
      <div className="relative flex flex-col items-center justify-center text-center px-4 py-16">
        <h1 className="text-5xl font-bold tracking-tight text-white drop-shadow-lg md:text-7xl lg:text-8xl">
          sonarflow
        </h1>
        <p className="mt-4 max-w-md text-lg text-white/90 md:text-xl">
          Code quality, automated. <br /> SonarQube meets your <em>AI editor</em>.
        </p>
        <Link to="/get-started" className="mt-10">
          <Button
            size="lg"
            className="min-w-[160px] text-base font-semibold bg-white text-[#130939] hover:bg-white/90"
            aria-label="Discover Sonarflow"
          >
            Discover
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Landing;
