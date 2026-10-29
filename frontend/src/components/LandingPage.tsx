import React from "react";
import { Page } from "./Page";
import { Cursor } from "./Cursor";
import "../styles/tokens.css";
import "../styles/global.css";

export const LandingPage: React.FC = () => {
  return (
    <>
      <Page />
      <Cursor />
    </>
  );
};

export default LandingPage;
