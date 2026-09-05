// Must run before anything in App fetches: it patches window.fetch so /api/*
// calls go to the external API host when one is configured.
import './apiBase.js'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
ReactDOM.createRoot(document.getElementById('root')).render(<App/>)
