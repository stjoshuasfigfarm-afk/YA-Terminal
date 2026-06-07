import React, { useState, useEffect } from "react";
import Markdown from "react-markdown";
import { cn } from "../lib/utils";

export const Typewriter = ({
  text,
  className = "text-emerald-500/80",
}: {
  text: string;
  className?: string;
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setDisplayedText("");
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
      }, 5);
      return () => clearTimeout(timeout);
    }
  }, [index, text]);

  return (
    <div
      className={cn(
        "markdown-body font-sans text-[9.5px] leading-relaxed space-y-1.5 relative",
        className,
      )}
    >
      <Markdown>{displayedText}</Markdown>
    </div>
  );
};
