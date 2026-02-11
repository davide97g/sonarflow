import { useRef } from "react";
import { Link } from "react-router-dom";
import CliDemo from "@/components/CliDemo";
import { Button } from "@/components/ui/button";

const Landing = () => {
  const cliDemoRef = useRef<HTMLDivElement>(null);

  const handleScrollToCliDemo = () => {
    cliDemoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <section className="relative w-full min-h-screen overflow-hidden scroll-smooth">
      <div className="px-4 sm:px-6 md:px-8 pt-16 sm:pt-20 pb-32">
        <div className="relative flex flex-col items-center justify-center text-center px-4 py-12 sm:py-16 min-h-[50vh]">
          <h1 className="text-5xl font-bold tracking-tight text-white drop-shadow-lg md:text-7xl lg:text-8xl">
            sonarflow
          </h1>
          <p className="mt-4 max-w-md text-lg text-white/90 md:text-xl">
            Code quality, automated. <br /> SonarQube meets your <em>AI editor</em>.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
            <Link to="/get-started">
              <Button
                size="lg"
                className="min-w-[160px] text-base font-semibold bg-white text-[#130939] hover:bg-white/90"
                aria-label="Discover Sonarflow"
              >
                Discover
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={handleScrollToCliDemo}
              className="min-w-[180px] text-base font-semibold border-white/60 text-white hover:bg-white/10"
              aria-label="Scroll to CLI demo"
            >
              See it in action
            </Button>
          </div>
        </div>
        <div
          ref={cliDemoRef}
          id="cli-demo"
          className="w-full max-w-2xl mx-auto px-4 pb-8 scroll-mt-8"
        >
          <CliDemo />
        </div>
      </div>
    </section>
  );
};

export default Landing;
