# 🌟 **AWS Friendly Counsellor** 🌟

![AWS Friendly Counsellor](https://github.com/ricscar2570/portfolio/blob/main/AWSFriendlyCounsellor/Senza%20titolo.jpg)

## 📝 **Descrizione**
**AWS Friendly Counsellor** è un'applicazione progettata per guidare **startup**, **piccole imprese** e **utenti meno esperti** nella pianificazione e utilizzo dei servizi **AWS**. Con un'interfaccia intuitiva e raccomandazioni proattive, l'app aiuta a esplorare le possibilità offerte da AWS in modo semplice, educativo e divertente.

---

## 🚀 **Caratteristiche Principali**

### 🎯 **1. Raccomandazioni Proattive Basate su Machine Learning**
- 🔮 **Modelli predittivi** suggeriscono i servizi AWS più adatti ai tuoi bisogni.
- 💰 **Stime dei costi** dettagliate prima di implementare la tua infrastruttura.
- 🏭 **Classificazione automatica del settore** basata sulla descrizione aziendale.

---

### 📊 **2. Simulazioni Interattive**
- 🌍 Simula i costi in **regioni AWS diverse**.
- ⚙️ Esplora **configurazioni alternative** per ottimizzare i costi.

| 🌍 **Regione**            | 💰 **Moltiplicatore Costo** | 📈 **Costo Simulato** |
|---------------------------|----------------------------|------------------------|
| US East (N. Virginia)     | 1.0                        | `$100`                |
| EU (Ireland)              | 1.2                        | `$120`                |
| Asia Pacific (Singapore)  | 1.5                        | `$150`                |

---

### 🏆 **3. Sistema di Gamification**
- Guadagna **badge** per i tuoi progressi:
  - 🏅 **Sector Guru**: Settore identificato correttamente.
  - 🥇 **AWS Explorer**: Servizi raccomandati utilizzati.
  - 🥈 **Data Driven**: Generazione di un report PDF.

🎉 **Visualizzazione Badge:**

🎯 Sector Guru 🛠️ AWS Explorer 📊 Data Driven




### 🛍️ **4. Collegamenti con il Marketplace AWS**
- Ogni servizio suggerito include un **link diretto** al Marketplace AWS per esplorare strumenti correlati.

Esempio:
- 🔗 [Amazon EC2 Marketplace](https://aws.amazon.com/marketplace/pp/prodview-ec2)
- 🔗 [Amazon S3 Marketplace](https://aws.amazon.com/marketplace/pp/prodview-s3)

---

### 🎓 **5. Educazione e Supporto**
- Ogni servizio raccomandato include una **descrizione dettagliata**.
- Genera report PDF per condividere i risultati con il tuo team.

---

### 🌈 **6. Grafici e Report Personalizzati**
- Visualizza costi stimati e raccomandazioni in **grafici interattivi**.
- Genera report PDF dettagliati per presentazioni interne.

![Grafico di esempio](https://github.com/ricscar2570/portfolio/blob/main/AWSFriendlyCounsellor/Senza%20titolo2.jpg)

---

## ⚙️ **Requisiti**

### Backend:
- **AWS DynamoDB**: Tabella `AWSFriendlyCounsellor`.
- **Modelli ML pre-addestrati**:
  - `service_recommendation_model.pkl`
  - `cost_prediction_model.pkl`
  - `sector_classification_model.pkl`
- **AWS Lambda** per elaborazione delle richieste.

### Frontend:
- **React.js**: Per l'interfaccia interattiva.
- **Material-UI**: Per componenti moderni e responsivi.

---

## 🚧 **Installazione**

### 🖥️ **Clona il Repository**

git clone https://github.com/your-repo/aws-friendly-counsellor.git
cd aws-friendly-counsellor

⚡ Backend

    Configura DynamoDB:
        Crea una tabella chiamata AWSFriendlyCounsellor.
        Popola la tabella con i dati di fallback.

    Carica i Modelli ML:
        Aggiungi i file .pkl al bucket S3 o al Lambda Layer.

    Distribuisci su AWS Lambda:
        Configura una funzione Lambda con il codice backend.
        Configura un endpoint API Gateway.

🌐 Frontend

    Installa le dipendenze:

npm install

Configura l'URL dell'API Gateway:

    Modifica App.js e sostituisci <API_GATEWAY_URL> con l'URL.

Avvia il server di sviluppo:

    npm start

💡 Come Utilizzare

    📝 Inserisci i dati:
        Descrivi la tua azienda.
        Specifica il tipo di necessità (es. calcolo intensivo o archiviazione).
        Indica il traffico stimato.

    📊 Ricevi Raccomandazioni:
        Visualizza i servizi AWS raccomandati con descrizioni dettagliate.

    🌍 Simula Configurazioni:
        Simula costi per regioni diverse.

    🏆 Ottieni Badge:
        Guadagna badge in base ai tuoi progressi.

    📄 Genera Report PDF:
        Scarica un report dettagliato per condividere i risultati.

🔮 Sviluppi Futuri

    🌟 Sfide personalizzate per il sistema di badge.
    📈 Integrazione con AWS Cost Explorer.
    🛠️ Simulazioni avanzate per resilienza e tempi di risposta.

🤝 Contribuisci

🎉 Sei il benvenuto! Apri un problema o invia una pull request per contribuire.
📜 Licenza

Questo progetto è distribuito sotto la licenza MIT. Consulta il file LICENSE per ulteriori dettagli.
