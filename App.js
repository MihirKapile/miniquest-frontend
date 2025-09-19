import React, { useState, useEffect, useRef } from 'react';

const backendURL = "http://10.0.0.89:5000"; // Your PC's IP address

// Set up the Speech Recognition API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false; // Process single utterances
    recognition.lang = 'en-US';
    recognition.interimResults = false;
}

export default function App() {
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [transcripts, setTranscripts] = useState([]);
    const [currentQuestStep, setCurrentQuestStep] = useState("Loading your quest...");
    const [error, setError] = useState("");

    const user = "player1"; // User ID for simplicity

    // Effect to start the quest on initial load
    useEffect(() => {
        const startNewQuest = async () => {
            try {
                const formData = new FormData();
                formData.append("user", user);

                const res = await fetch(`${backendURL}/start`, {
                    method: "POST",
                    body: formData,
                });

                if (!res.ok) {
                    throw new Error(`Server responded with ${res.status}`);
                }
                const data = await res.json();
                setCurrentQuestStep(data.ai_response);
                setTranscripts([{ child: data.child_input, ai: data.ai_response }]);
            } catch (err) {
                console.error("Failed to start quest:", err);
                setError("Could not connect to the MiniQuest server. Please ensure it's running.");
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

    // Effect to handle speech recognition events
    useEffect(() => {
        if (!recognition) return;

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            console.log("Transcript received:", transcript);
            await sendTranscriptToServer(transcript);
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            setError("Something went wrong with speech recognition.");
            setIsRecording(false);
            setIsLoading(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

    }, []);

    const sendTranscriptToServer = async (transcript) => {
        setIsLoading(true);
        setError("");
        try {
            const payload = {
                user: user,
                previous_step: currentQuestStep,
                child_input: transcript
            };

            const res = await fetch(`${backendURL}/turn`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error(`Server error: ${res.status}`);

            const data = await res.json();
            setTranscripts(prev => [...prev, { child: data.child_input, ai: data.ai_response }]);
            setCurrentQuestStep(data.ai_response);

        } catch (err) {
            console.error("Error sending transcript to server:", err);
            setError("Failed to get the next quest step.");
        } finally {
            setIsLoading(false);
        }
    };


    const toggleRecording = () => {
        if (isRecording) {
            recognition.stop();
        } else {
            recognition.start();
            setIsRecording(true);
            setError("");
        }
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>MiniQuest Adventure</h1>
            <p style={styles.step}>{isLoading ? "Thinking of what happens next..." : currentQuestStep}</p>

            {error && <p style={styles.error}>{error}</p>}

            <button
                onClick={toggleRecording}
                disabled={isLoading || !SpeechRecognition}
                style={isRecording ? styles.recordingButton : styles.button}
            >
                {isRecording ? 'Listening...' : 'Push to Talk'}
            </button>

            <div style={styles.scroll}>
                {transcripts.slice().reverse().map((t, i) => (
                    <div key={i} style={styles.transcript}>
                        <p style={styles.ai}>
                            <strong>Storyteller:</strong> {t.ai}
                        </p>
                        <p style={styles.child}>
                            <strong>You said:</strong> {t.child}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

const styles = {
    container: { fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: 'auto', padding: '20px', textAlign: 'center', backgroundColor: '#f0f8ff', borderRadius: '10px' },
    title: { fontSize: '2em', color: '#4682b4' },
    step: { fontSize: '1.2em', color: '#333', minHeight: '50px' },
    button: { backgroundColor: '#4caf50', color: 'white', padding: '15px 30px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1em', margin: '20px 0' },
    recordingButton: { backgroundColor: '#f44336', color: 'white', padding: '15px 30px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1em', margin: '20px 0' },
    scroll: { marginTop: '20px', maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '5px', backgroundColor: '#fff' },
    transcript: { marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px', textAlign: 'left' },
    child: { fontSize: '1em', color: '#0000cd' },
    ai: { fontSize: '1em', color: '#2e8b57' },
    error: { color: 'red', marginTop: '10px' },
};