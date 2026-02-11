import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  centered?: boolean;
  className?: string;
}

const TITLE_SHADOW = "0 1px 3px rgba(0,0,0,0.9), 0 0 24px rgba(0,0,0,0.5)";
const SUBTITLE_SHADOW = "0 1px 2px rgba(0,0,0,0.85), 0 0 12px rgba(0,0,0,0.4)";

/** High-contrast title and optional subtitle for use over the app Grainient background */
const PageHeader = ({ title, subtitle, centered = false, className = "" }: PageHeaderProps) => {
  return (
    <div className={`mb-12 ${centered ? "text-center" : ""} ${className}`}>
      <h1 className="text-4xl font-bold mb-4 text-white" style={{ textShadow: TITLE_SHADOW }}>
        {title}
      </h1>
      {subtitle != null && (
        <p
          className={`text-lg text-white/95 max-w-2xl ${centered ? "mx-auto" : ""}`}
          style={{ textShadow: SUBTITLE_SHADOW }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default PageHeader;
