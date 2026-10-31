import React from "react";

interface WordsProps {
  text: string;
  className?: string;
}

export const Words: React.FC<WordsProps> = ({ text, className }) => {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <React.Fragment key={i}>
          <span className={className} data-word="true" style={{ display: "inline-block" }}>
            {word}
          </span>
          {i < words.length - 1 ? " " : ""}
        </React.Fragment>
      ))}
    </>
  );
};
