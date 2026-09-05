import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'
import './index.css'

import { GoogleOAuthProvider } from '@react-oauth/google';

// Simple Error Boundary to prevent white screen
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong.</h1>
                    <p className="text-gray-600 mb-4">Please refresh the page.</p>
                    <div className="bg-gray-100 p-4 rounded text-left overflow-auto max-w-lg mx-auto text-xs font-mono text-red-800">
                        {this.state.error?.toString()}
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const GOOGLE_CLIENT_ID = '255657544771-f83qrosah74t147ln3iden1r195u3m7s.apps.googleusercontent.com';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <ErrorBoundary>
                <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                    <AuthProvider>
                        <App />
                    </AuthProvider>
                </GoogleOAuthProvider>
            </ErrorBoundary>
        </BrowserRouter>
    </React.StrictMode>,
)
