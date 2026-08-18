import React from "react";
import { cn } from "@/lib/utils";

export const PageContainer = ({ children, className, maxWidth = "max-w-6xl", testid }) => {
  return (
    <div
      data-testid={testid}
      className={cn(
        "app-shell",
        "px-4 sm:px-6 py-6 pb-28 sm:pb-20 mx-auto",
        maxWidth,
        className,
      )}
    >
      {children}
    </div>
  );
};

export default PageContainer;
