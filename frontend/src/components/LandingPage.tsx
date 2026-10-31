import React from "react";
import { Page } from "./Page";
import { Cursor } from "./Cursor";
import "../styles/tokens.css";
import "../styles/global.css";

export const LandingPage: React.FC = () => {
  return (
    <div className="lexicore-landing-scope">
      <Page />
      <Cursor />
    </div>
  );
};

export default LandingPage;
