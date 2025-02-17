import React, { useState } from "react";
import { Button, TextField, Box, Typography, Paper } from "@mui/material";

const API_URL = "https://your-api-gateway-url.amazonaws.com/prod";

const FreeTierFinder = () => {
  const [requirements, setRequirements] = useState("");
  const [suggestedSolution, setSuggestedSolution] = useState("");

  const handleFindSolution = async () => {
    const res = await fetch(`${API_URL}/find_free_tier`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requirements }),
    });

    const data = await res.json();
    setSuggestedSolution(data.suggestedSolution);
  };

  return (
    <Box>
      <TextField label="Describe your requirements" fullWidth value={requirements} onChange={(e) => setRequirements(e.target.value)} />
      <Button onClick={handleFindSolution}>🔍 Find Free AWS Solution</Button>
      {suggestedSolution && <Paper>{suggestedSolution}</Paper>}
    </Box>
  );
};

export default FreeTierFinder;
