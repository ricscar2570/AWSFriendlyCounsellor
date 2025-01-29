# 🌍 AWS Friendly Counsellor
🚀 **Il tuo consulente intelligente per ottimizzare AWS e ridurre i costi!**

AWS Friendly Counsellor è una **web application basata su Machine Learning** che analizza le esigenze aziendali e fornisce **raccomandazioni personalizzate sui servizi AWS**, stimando i costi e suggerendo ottimizzazioni.

---

## **🔹 Funzionalità Principali**
✅ **Analisi AI del Settore Aziendale**: Identifica il settore della tua azienda in base alla descrizione.  
✅ **Raccomandazione dei Servizi AWS**: Suggerisce i migliori servizi AWS per le tue esigenze.  
✅ **Simulazione Costi AWS**: Stima il costo mensile dei servizi AWS selezionati.  
✅ **Grafici Interattivi** 📊: Visualizza i costi e le ottimizzazioni con grafici chiari e intuitivi.  
✅ **Gamification & Badge** 🏆: Ottieni badge in base alle ottimizzazioni effettuate.  
✅ **Demo Interattiva** 🎮: Prova la piattaforma senza registrarti!  
✅ **Dark Mode 🌙**: Interfaccia moderna con modalità chiara e scura.  
✅ **GDPR Compliance** 🔐: Accesso e cancellazione dati utente, crittografia avanzata.  

---

## **🔧 Tecnologie Utilizzate**
| **Componente** | **Tecnologia** |
|---------------|---------------|
| **Frontend** | React, Material UI, Tailwind CSS |
| **Backend** | AWS Lambda, DynamoDB, API Gateway |
| **Machine Learning** | XGBoost, Scikit-learn, Pandas |
| **Database** | AWS DynamoDB (criptato con AWS KMS) |
| **Sicurezza** | Token JWT, AWS Security Hub |
| **Hosting** | AWS S3, CloudFront |

---

## **🚀 Architettura del Progetto**
```
AWS-Friendly-Counsellor/ │── backend/ │ ├── lambda_function.py # Funzione AWS Lambda principale │ ├── lambda_demo_function.py # Endpoint API per demo interattiva │ ├── models/ │ │ ├── sector_classification_model.pkl # ML: Classificazione Settore │ │ ├── cost_prediction_model.pkl # ML: Predizione Costi AWS │ │ ├── service_recommendation_model.pkl # ML: Suggerimento Servizi AWS │── frontend/ │ ├── src/ │ │ ├── components/ │ │ │ ├── ResultsSection.js # Visualizzazione risultati │ │ │ ├── ThemeToggle.js # Dark Mode │ │ ├── pages/ │ │ │ ├── LandingPage.js # Landing Page Promozionale │ │ │ ├── Demo.js # Demo Interattiva │ │ ├── styles/ │ │ │ ├── App.css # Stili principali │ ├── public/ │ │ ├── index.html # Punto di ingresso React │── api_gateway/ │ ├── api_config.json # Configurazione AWS API Gateway │── docs/ │ ├── README.md # Documentazione │ ├── User_Guide.md # Guida utente │── test/ │ ├── test_lambda.py # Test unitari AWS Lambda │ ├── test_api.py # Test API Gateway
```

---

## **📌 Come Funziona**
1️⃣ **Inserisci i dati aziendali**: Descrizione, esigenze e traffico stimato.  
2️⃣ **Ottieni raccomandazioni AWS**: L’AI suggerisce i servizi più adatti.  
3️⃣ **Simula il costo AWS**: Confronta le opzioni di pricing.  
4️⃣ **Guadagna Badge!** 🏆: Ottieni premi per ottimizzazioni avanzate.  
5️⃣ **Scarica il report PDF** 📄: Condividi le raccomandazioni con il tuo team.  

---

## **📥 Installazione**
### **1️⃣ Clonare il repository**
```bash
git clone https://github.com/tuo-utente/AWS-Friendly-Counsellor.git
cd AWS-Friendly-Counsellor

2️⃣ Installare le dipendenze

cd frontend
npm install

3️⃣ Avviare il Frontend

npm start

L'app sarà disponibile su: http://localhost:3000
🔗 API Endpoints
Metodo	Endpoint	Descrizione
POST	/api/get-recommendations	Raccomanda servizi AWS per un’azienda
GET	/api/demo-recommendations	Restituisce dati demo predefiniti
POST	/api/simulate-cost	Simula il costo AWS per un’azienda
GET	/api/get-user-data	Ottieni i dati dell'utente (GDPR)
DELETE	/api/delete-user-data	Cancella i dati utente su richiesta
📊 Grafici e Report

L’app utilizza Plotly.js per generare grafici interattivi e analizzare:

    Distribuzione dei Costi AWS 📊
    Confronto tra Servizi Raccomandati
    Risparmio Potenziale sui Costi AWS

🛡 Sicurezza & GDPR

🔒 Dati Protetti: AWS KMS per crittografia su DynamoDB.
🔑 Accesso ai Dati: Gli utenti possono scaricare e cancellare i propri dati.
🛠 Audit AWS Security Hub: Nessuna vulnerabilità critica rilevata.
📢 Monetizzazione e Business Model

📌 Opzioni di Pricing:
✅ Freemium: Versione base gratuita con funzioni avanzate a pagamento.
✅ Abbonamento SaaS: Piani da $9.99/mese per startup e aziende.
✅ Licenza Enterprise: Versione personalizzata per aziende su richiesta.
🌟 Prossimi Passi

🔹 Lanciare l’API su AWS: Distribuire il backend su Lambda e API Gateway.
🔹 Ottimizzare il SEO della landing page: Per migliorare il traffico organico.
🔹 Avviare campagne marketing: AWS Marketplace, LinkedIn, Google Ads.
🔹 Ottenere primi clienti/tester: Far provare il prodotto a startup e PMI.
📬 Contatti

📧 Email: support@aws-friendly-counsellor.com
🔗 Sito Web: aws-friendly-counsellor.com
📌 LinkedIn: AWS Friendly Counsellor
