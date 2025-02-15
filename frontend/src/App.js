import React from "react";
import { Typography } from "@mui/material";
import FreeTierFinder from "./FreeTierFinder";
import CostComparison from "./CostComparison";

const App = () => {
  return (
    <div>
      <Typography variant="h4">AWS Friendly Counsellor</Typography>
      <FreeTierFinder />
      <CostComparison />
    </div>
  );
};

export default App;
