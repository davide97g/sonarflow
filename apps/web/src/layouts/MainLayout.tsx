import type { ReactNode } from "react";
import Grainient from "@/components/Grainient";
import GradualBlur from "@/components/GradualBlur";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* App-wide Grainient background */}
      <div className="fixed inset-0 z-0 w-full h-full" aria-hidden>
        <Grainient
          color1="#ff9e9e"
          color2="#130939"
          color3="#21202d"
          timeSpeed={0.9}
          colorBalance={0}
          warpStrength={1}
          warpFrequency={5}
          warpSpeed={2}
          warpAmplitude={50}
          blendAngle={0}
          blendSoftness={0.05}
          rotationAmount={500}
          noiseScale={2}
          grainAmount={0.1}
          grainScale={2}
          grainAnimated={false}
          contrast={1.5}
          gamma={1}
          saturation={1}
          centerX={0}
          centerY={0}
          zoom={0.9}
          className="absolute inset-0 w-full h-full"
        />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navigation />
        <main className="flex-1">{children}</main>
        <Footer />
        <GradualBlur
          target="page"
          position="bottom"
          height="8rem"
          strength={2}
          divCount={6}
          curve="bezier"
          exponential
          opacity={1}
        />
      </div>
    </div>
  );
};

export default MainLayout;
