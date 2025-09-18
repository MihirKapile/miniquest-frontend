import React, { useState, useEffect, useRef } from "react";
import { View, Text, Button, ScrollView, StyleSheet } from "react-native";
import { Audio } from "expo-av";

export default function App() {
  const [recording, setRecording] = useState(null);
  const [transcripts, setTranscripts] = useState([]);
  const [questStep, setQuestStep] = useState(
    "Your MiniQuest begins in a magical forest. Which path will you take? Left or Right?"
  );

  const user = "player1"; // for simplicity

  // -------------------------------
  // Start recording
  // -------------------------------
  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        alert("Permission required to record audio!");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      await rec.startAsync();
      setRecording(rec);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  }

  // -------------------------------
  // Stop recording and send to backend
  // -------------------------------
  async function stopRecording() {
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      // Convert local file URI to blob
      const responseFile = await fetch(uri);
      const blob = await responseFile.blob();

      // Wrap in a File object
      const file = new File([blob], "audio.wav", { type: "audio/wav" });

      const formData = new FormData();
      formData.append("audio", file);          // key matches Flask backend
      formData.append("user", user);           // user field
      formData.append("previous_step", questStep);

      const backendURL = "http://10.0.0.89:5000/turn"; // replace with your PC IP
      const res = await fetch(backendURL, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Server responded with error:", text);
        return;
      }

      const data = await res.json();
      setTranscripts((prev) => [
        ...prev,
        { child: data.child_input, ai: data.ai_response },
      ]);
      setQuestStep(data.ai_response);
      setRecording(null);
    } catch (err) {
      console.error("Failed to stop recording", err);
    }
  }


  return (
    <View style={styles.container}>
      <Text style={styles.title}>MiniQuest</Text>
      <Text style={styles.step}>{questStep}</Text>

      <Button
        title={recording ? "Stop Recording" : "Start Recording"}
        onPress={recording ? stopRecording : startRecording}
      />

      <ScrollView style={styles.scroll}>
        {transcripts.map((t, i) => (
          <View key={i} style={styles.transcript}>
            <Text style={styles.child}>Child: {t.child}</Text>
            <Text style={styles.ai}>AI: {t.ai}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, marginTop: 40 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  step: { fontSize: 18, marginBottom: 20 },
  scroll: { marginTop: 20 },
  transcript: { marginBottom: 15 },
  child: { fontSize: 16, color: "blue" },
  ai: { fontSize: 16, color: "green" },
});