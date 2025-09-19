import React, { useState, useEffect, useRef } from 'react';

const backendURL = "http://10.0.0.89:5000";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
}

const ParentDashboard = ({ questId, onBackToGame }) => {
    const [data, setData] = useState(null);
    const [recap, setRecap] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [recapLoading, setRecapLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!questId) return;
            try {
                setIsLoading(true);
                const res = await fetch(`${backendURL}/dashboard/${questId}`);
                if (!res.ok) throw new Error("Failed to fetch dashboard data");
                const dashData = await res.json();
                setData(dashData);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [questId]);

    const handleGenerateRecap = async () => {
        try {
            setRecapLoading(true);
            setRecap("");
            const res = await fetch(`${backendURL}/recap/${questId}`, { method: 'POST' });
            if (!res.ok) throw new Error("Failed to generate recap");
            const recapData = await res.json();
            setRecap(recapData.recap);
        } catch (error) {
            console.error(error);
            setRecap("Sorry, we couldn't create a story recap right now.");
        } finally {
            setRecapLoading(false);
        }
    };

    if (isLoading) {
        return <div style={styles.container}><p>Loading Dashboard...</p></div>;
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Parent Dashboard</h1>
            <div style={styles.dashGrid}>
                <div style={styles.dashCard}>
                    <h2>Time on Task</h2>
                    <p>{data?.time_on_task || 'N/A'}</p>
                </div>
                <div style={styles.dashCard}>
                    <h2>Skills Practiced</h2>
                    <div style={styles.tagContainer}>
                        {data?.skills_tagged?.length > 0 ? data.skills_tagged.map(skill => (
                            <span key={skill} style={styles.tag}>{skill}</span>
                        )) : <p>None yet</p>}
                    </div>
                </div>
                <div style={{...styles.dashCard, ...styles.fullWidthCard}}>
                    <h2>Choices Made</h2>
                    <ul>
                        {data?.choices_made?.length > 0 ? data.choices_made.map((choice, i) => (
                           <li key={i}>{choice.choice}</li>
                        )) : <p>No major choices made yet.</p>}
                    </ul>
                </div>
                 <div style={{...styles.dashCard, ...styles.fullWidthCard}}>
                    <h2>Story Recap</h2>
                    <button onClick={handleGenerateRecap} disabled={recapLoading} style={styles.button}>
                        {recapLoading ? 'Creating Story...' : 'Export 3-Sentence Recap'}
                    </button>
                    {recap && <p style={styles.recapText}>{recap}</p>}
                </div>
            </div>
            <button onClick={onBackToGame} style={{...styles.button, backgroundColor: '#6c757d'}}>Back to Game</button>
        </div>
    );
};


export default function App() {
    const [view, setView] = useState('game');
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [transcripts, setTranscripts] = useState([]);
    const [questId, setQuestId] = useState(null);
    const [currentAIResponse, setCurrentAIResponse] = useState("Loading your quest...");
    const [error, setError] = useState("");

    const user = "player1";

    useEffect(() => {
        const startNewQuest = async () => {
            try {
                const res = await fetch(`${backendURL}/start`, {
                    method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user }),
                });
                if (!res.ok) throw new Error(`Server responded with ${res.status}`);
                const data = await res.json();
                setQuestId(data.quest_id);
                setCurrentAIResponse(data.ai_response);
                setTranscripts([{ child: "Game Started", ai: data.ai_response }]);
            } catch (err) {
                console.error("Failed to start quest:", err);
                setError("Could not connect to the MiniQuest server. Is it running?");
            } finally {
                setIsLoading(false);
            }
        };
        if (!SpeechRecognition) {
            setError("Sorry, your browser doesn't support speech recognition. Please try Chrome.");
            setIsLoading(false);
        } else {
            startNewQuest();
        }
    }, []);

    useEffect(() => {
        if (!recognition) return;
        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            if (questId) await sendTranscriptToServer(transcript);
        };
        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            setError("Something went wrong with speech recognition.");
            setIsRecording(false); setIsLoading(false);
        };
        recognition.onend = () => setIsRecording(false);
    }, [questId]);

    const sendTranscriptToServer = async (transcript) => {
        setIsLoading(true); setError("");
        try {
            const res = await fetch(`${backendURL}/turn`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quest_id: questId, child_input: transcript })
            });
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const data = await res.json();
            setTranscripts(prev => [...prev, { child: transcript, ai: data.ai_response }]);
            setCurrentAIResponse(data.ai_response);
        } catch (err) {
            console.error("Error sending transcript:", err);
            setError("Failed to get the next quest step.");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleRecording = () => {
        if (!recognition) return;
        if (isRecording) recognition.stop();
        else { recognition.start(); setIsRecording(true); setError(""); }
    };

    if (view === 'dashboard') {
        return <ParentDashboard questId={questId} onBackToGame={() => setView('game')} />;
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>MiniQuest Adventure</h1>
            <p style={styles.step}>{isLoading ? "The storyteller is thinking..." : currentAIResponse}</p>
            {error && <p style={styles.error}>{error}</p>}
            <button onClick={toggleRecording} disabled={isLoading || !SpeechRecognition} style={isRecording ? styles.recordingButton : styles.button}>
                {isRecording ? 'Listening...' : 'Push to Talk'}
            </button>
            <div style={styles.scroll}>
                {transcripts.slice().reverse().map((t, i) => (
                    <div key={i} style={styles.transcript}>
                        <p style={styles.ai}><strong>Storyteller:</strong> {t.ai}</p>
                        <p style={styles.child}><strong>You said:</strong> {t.child}</p>
                    </div>
                ))}
            </div>
            <button onClick={() => setView('dashboard')} style={styles.dashboardButton}>
                View Parent Dashboard
            </button>
        </div>
    );
}

const styles = {
    container: { fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: 'auto', padding: '20px', textAlign: 'center', backgroundColor: '#f0f8ff', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' },
    title: { fontSize: '2.2em', color: '#4682b4', fontWeight: 'bold' },
    step: { fontSize: '1.3em', color: '#333', minHeight: '60px', padding: '10px', fontStyle: 'italic' },
    button: { backgroundColor: '#4caf50', color: 'white', padding: '15px 30px', border: 'none', borderRadius: '50px', cursor: 'pointer', fontSize: '1em', margin: '10px 0', transition: 'background-color 0.3s' },
    recordingButton: { backgroundColor: '#f44336', color: 'white', padding: '15px 30px', border: 'none', borderRadius: '50px', cursor: 'pointer', fontSize: '1em', margin: '20px 0', animation: 'pulse 1.5s infinite' },
    dashboardButton: { backgroundColor: '#007bff', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.9em', marginTop: '20px' },
    scroll: { marginTop: '20px', maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', padding: '15px', borderRadius: '10px', backgroundColor: '#fff' },
    transcript: { marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px', textAlign: 'left' },
    child: { fontSize: '1em', color: '#0000cd' },
    ai: { fontSize: '1em', color: '#2e8b57' },
    error: { color: 'red', marginTop: '10px', fontWeight: 'bold' },
    dashGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', margin: '20px 0' },
    dashCard: { backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', textAlign: 'left' },
    fullWidthCard: { gridColumn: '1 / -1' },
    tagContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
    tag: { backgroundColor: '#e0e0e0', padding: '5px 10px', borderRadius: '15px', fontSize: '0.9em' },
    recapText: { marginTop: '15px', fontStyle: 'italic', backgroundColor: '#fafad2', padding: '10px', borderRadius: '5px' },
};
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }`;
document.head.appendChild(styleSheet);