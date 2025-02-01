import React, { useState } from "react";
import { 
  Button, TextField, MenuItem, Select, FormControl, InputLabel, 
  Box, Typography, Paper, List, ListItem, ListItemText 
} from "@mui/material";
import { Bar } from "react-chartjs-2";
import Chart from 'chart.js/auto';

const API_URL = "https://your-api-gateway-url.amazonaws.com/prod"; // Sostituisci con il vero URL API

const App = () => {
  const [formData, setFormData] = useState({
    userId: "user123",
    budget: "",
    workloadType: "web",
    scalability: "Alta",
    reliability: "Critica",
    region: "US East (N. Virginia)",
    pricingModel: "OnDemand"
  });

  const [recommendation, setRecommendation] = useState(null);
  const [bestPractices, setBestPractices] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitRecommendation = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "recommendation", ...formData }),
      });

      const data = await res.json();
      setRecommendation(data);
    } catch (error) {
      console.error("Errore durante la richiesta:", error);
    }
  };

  const handleSubmitBestPractices = async () => {
    try {
      const res = await fetch(`${API_URL}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "best_practices", workloadType: formData.workloadType }),
      });

      const data = await res.json();
      setBestPractices(data.bestPractices);
    } catch (error) {
      console.error("Errore durante la richiesta delle best practice:", error);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, margin: "auto", padding: 2 }}>
      <Typography variant="h4" gutterBottom>
        🌐 Motore AI di Raccomandazione AWS
      </Typography>

      <form onSubmit={handleSubmitRecommendation}>
        <TextField
          fullWidth
          label="Budget mensile ($)"
          type="number"
          name="budget"
          value={formData.budget}
          onChange={handleChange}
          margin="normal"
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>Tipo di Workload</InputLabel>
          <Select name="workloadType" value={formData.workloadType} onChange={handleChange}>
            <MenuItem value="web">Applicazione Web</MenuItem>
            <MenuItem value="ai">Machine Learning</MenuItem>
            <MenuItem value="bigdata">Big Data</MenuItem>
            <MenuItem value="gaming">Gaming</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth margin="normal">
          <InputLabel>Scalabilità</InputLabel>
          <Select name="scalability" value={formData.scalability} onChange={handleChange}>
            <MenuItem value="Alta">Alta</MenuItem>
            <MenuItem value="Media">Media</MenuItem>
            <MenuItem value="Bassa">Bassa</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth margin="normal">
          <InputLabel>Affidabilità</InputLabel>
          <Select name="reliability" value={formData.reliability} onChange={handleChange}>
            <MenuItem value="Critica">Critica</MenuItem>
            <MenuItem value="Standard">Standard</MenuItem>
            <MenuItem value="Minima">Minima</MenuItem>
          </Select>
        </FormControl>

        {/* Regione AWS */}
        <FormControl fullWidth margin="normal">
          <InputLabel>Regione AWS</InputLabel>
          <Select name="region" value={formData.region} onChange={handleChange}>
            <MenuItem value="US East (N. Virginia)">US East (N. Virginia)</MenuItem>
            <MenuItem value="US West (Oregon)">US West (Oregon)</MenuItem>
            <MenuItem value="EU (Frankfurt)">EU (Francoforte)</MenuItem>
            <MenuItem value="Asia Pacific (Tokyo)">Asia Pacific (Tokyo)</MenuItem>
          </Select>
        </FormControl>

        {/* Modello di Pricing AWS */}
        <FormControl fullWidth margin="normal">
          <InputLabel>Modello di Pricing AWS</InputLabel>
          <Select name="pricingModel" value={formData.pricingModel} onChange={handleChange}>
            <MenuItem value="OnDemand">On-Demand</MenuItem>
            <MenuItem value="Reserved">Reserved Instances</MenuItem>
            <MenuItem value="Spot">Spot Instances</MenuItem>
          </Select>
        </FormControl>

        <Button type="submit" variant="contained" color="primary" fullWidth>
          🔍 Ottieni Raccomandazione AI
        </Button>
      </form>

      {recommendation && (
        <Paper sx={{ marginTop: 3, padding: 2 }}>
          <Typography variant="h5">🔍 Servizio AWS Raccomandato</Typography>
          {recommendation.bestService.service ? (
            <>
              <Typography>✅ **{recommendation.bestService.service}**</Typography>
              <Typography>💰 Costo stimato: ${recommendation.bestService.cost}</Typography>
              <Typography>📈 Scalabilità: {recommendation.bestService.scalability}</Typography>
              <Typography>🔒 Affidabilità: {recommendation.bestService.reliability}</Typography>
              <Typography>📍 Regione: {recommendation.bestService.region}</Typography>
              <Typography>💳 Modello di Pricing: {recommendation.bestService.pricingModel}</Typography>
              <Typography>🔄 Costo Trasferimento Dati: ${recommendation.bestService.dataTransferCost}</Typography>

              <Bar
                data={{
                  labels: [recommendation.bestService.service, "Budget Disponibile"],
                  datasets: [
                    {
                      label: "Costo ($)",
                      data: [recommendation.bestService.cost, formData.budget],
                      backgroundColor: ["#f44336", "#4caf50"],
                    },
                  ],
                }}
                options={{
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    y: { beginAtZero: true },
                  },
                }}
              />

              <Typography variant="h6" sx={{ marginTop: 2 }}>🤖 Valutazione AI</Typography>
              <Typography>{recommendation.aiEvaluation}</Typography>
            </>
          ) : (
            <Typography color="error">{recommendation.bestService.error}</Typography>
          )}
        </Paper>
      )}

      <Box sx={{ marginTop: 4 }}>
        <Button variant="contained" color="secondary" fullWidth onClick={handleSubmitBestPractices}>
          📖 Ottieni Best Practices AWS
        </Button>
      </Box>

      {bestPractices && (
        <Paper sx={{ marginTop: 3, padding: 2 }}>
          <Typography variant="h5">📖 Best Practices AWS</Typography>
          <List>
            {bestPractices.map((practice, index) => (
              <ListItem key={index}>
                <ListItemText primary={practice.LensName} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default App;
