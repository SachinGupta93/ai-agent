'use client';

import { useEffect, useRef, useState } from 'react';

export default function VoiceAgent() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [agentType, setAgentType] = useState('');
  const [processingMode, setProcessingMode] = useState<'standard' | 'langgraph'>('langgraph');
  const [sessionId, setSessionId] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setTranscript(text);
          fetchAgentReply(text);
        };

        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const fetchAgentReply = async (userInput: string) => {
    try {
      if (processingMode === 'langgraph') {
        // Use LangGraph multi-agent system
        const langGraphRes = await fetch('/api/langgraph', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: userInput,
            sessionId: sessionId || undefined
          }),
        });
        
        if (langGraphRes.ok) {
          const langGraphData = await langGraphRes.json();
          if (langGraphData.success) {
            setResponse(langGraphData.result);
            setAgentType(langGraphData.agentType);
            setSessionId(langGraphData.sessionId);
            speak(langGraphData.result);
            return;
          }
        }
        
        // Fallback to standard processing if LangGraph fails
        console.warn('LangGraph failed, falling back to standard processing');
      }
      
      // Standard processing (original logic)
      // First try to process through the agent brain for system commands
      const agentRes = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command: userInput }),
      });
      
      if (agentRes.ok) {
        const agentData = await agentRes.json();
        if (agentData.status && agentData.status !== `Command "${userInput}" received and logged.`) {
          // System command was executed
          setResponse(agentData.status);
          setAgentType('system');
          speak(agentData.status);
          return;
        }
      }
      
      // If not a system command, use the chat API for LLM response
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: userInput }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        const reply = data.result || 'No response received';
        setResponse(reply);
        setAgentType('chat');
        speak(reply);
      } else {
        const errorMsg = `Error: ${data.error || 'Failed to get response'}`;
        setResponse(errorMsg);
        setAgentType('error');
        speak(errorMsg);
      }
    } catch (error) {
      const errorMsg = 'Network error: Unable to connect to the server';
      setResponse(errorMsg);
      setAgentType('error');
      speak(errorMsg);
    }
  };

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const handleStartListening = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      setTranscript('');
      recognitionRef.current.start();
    }
  };

  return (
    <div className="p-4 rounded-xl bg-gray-100 w-full max-w-lg shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">🎙️ Voice Assistant</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Mode:</label>
          <select
            value={processingMode}
            onChange={(e) => setProcessingMode(e.target.value as 'standard' | 'langgraph')}
            className="text-xs px-2 py-1 rounded border"
          >
            <option value="langgraph">LangGraph Multi-Agent</option>
            <option value="standard">Standard</option>
          </select>
        </div>
      </div>
      
      <button
        onClick={handleStartListening}
        disabled={isListening}
        className="bg-blue-600 text-white px-4 py-2 rounded-xl w-full"
      >
        {isListening ? 'Listening...' : 'Start Voice Input'}
      </button>

      {processingMode === 'langgraph' && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {agentType && (
            <span className={`px-2 py-1 rounded-full text-white ${
              agentType === 'system' ? 'bg-red-500' :
              agentType === 'memory' ? 'bg-purple-500' :
              agentType === 'task' ? 'bg-green-500' :
              agentType === 'coding' ? 'bg-blue-500' :
              agentType === 'chat' ? 'bg-gray-500' : 'bg-orange-500'
            }`}>
              {agentType.toUpperCase()} Agent
            </span>
          )}
          {sessionId && (
            <span className="text-gray-500">
              Session: {sessionId.slice(0, 8)}...
            </span>
          )}
        </div>
      )}

      <div className="mt-4">
        <p><strong>You:</strong> {transcript}</p>
        <p className="mt-2"><strong>AI Agent:</strong> {response}</p>
      </div>
    </div>
  );
}