#!/bin/bash
cd backend && uvicorn lambda_function:app --host 0.0.0.0 --port 8000 & 
cd frontend && npm start
