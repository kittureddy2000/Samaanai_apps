/**
 * Voice Input Button Component
 * Reusable component for voice input across the app
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Alert } from 'react-native';
import { IconButton, Portal, Modal, Text, Button, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import voiceService from '../services/voiceService';
import { parseVoiceCommand, getSuggestedCommands } from '../services/voiceCommandParser';

export default function VoiceInputButton({ onCommandParsed, commandType = 'all' }) {
  const [isListening, setIsListening] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedCommand, setParsedCommand] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if voice recognition is available
    checkAvailability();

    return () => {
      voiceService.destroy();
    };
  }, []);

  const checkAvailability = async () => {
    const available = await voiceService.isAvailable();
    if (!available) {
      console.warn('Voice recognition not available');
    }
  };

  const startListening = async () => {
    try {
      setError(null);
      setTranscript('');
      setParsedCommand(null);
      setShowModal(true);
      setIsListening(true);

      await voiceService.startListening(
        (text) => {
          // Speech recognition successful
          setTranscript(text);
          setIsListening(false);

          // Parse the command
          const parsed = parseVoiceCommand(text);

          if (parsed) {
            // Filter by command type if specified
            if (commandType === 'all' || parsed.type === commandType) {
              setParsedCommand(parsed);
            } else {
              setError(`Expected ${commandType} command, but got ${parsed.type}`);
            }
          } else {
            setError('Could not understand the command. Please try again.');
          }
        },
        (err) => {
          // Speech recognition error
          setIsListening(false);
          setError(err.message || 'Voice recognition failed');
        }
      );
    } catch (err) {
      setIsListening(false);
      setError(err.message || 'Failed to start voice recognition');
    }
  };

  const stopListening = async () => {
    await voiceService.stopListening();
    setIsListening(false);
  };

  const handleConfirm = () => {
    if (parsedCommand && onCommandParsed) {
      onCommandParsed(parsedCommand, transcript);
    }
    handleClose();
  };

  const handleClose = () => {
    setShowModal(false);
    setTranscript('');
    setParsedCommand(null);
    setError(null);
    if (isListening) {
      stopListening();
    }
  };

  const getSuggestions = () => {
    const suggestions = getSuggestedCommands();
    if (commandType === 'task') return suggestions.tasks;
    if (commandType === 'calorie') return suggestions.calories;
    if (commandType === 'exercise') return suggestions.exercise;
    return [...suggestions.tasks, ...suggestions.calories];
  };

  return (
    <>
      <IconButton
        icon="microphone"
        size={28}
        onPress={startListening}
        iconColor="#1976d2"
        style={styles.micButton}
      />

      <Portal>
        <Modal
          visible={showModal}
          onDismiss={handleClose}
          contentContainerStyle={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <MaterialCommunityIcons
              name="microphone"
              size={40}
              color={isListening ? '#d32f2f' : '#1976d2'}
            />
            <Text style={styles.modalTitle}>
              {isListening ? 'Listening...' : 'Voice Input'}
            </Text>
          </View>

          {isListening && (
            <View style={styles.listeningContainer}>
              <ActivityIndicator size="large" color="#d32f2f" />
              <Text style={styles.listeningText}>Speak now</Text>
              <Button
                mode="outlined"
                onPress={stopListening}
                style={styles.stopButton}
              >
                Stop
              </Button>
            </View>
          )}

          {transcript && !isListening && (
            <View style={styles.resultContainer}>
              <Text style={styles.label}>You said:</Text>
              <Text style={styles.transcript}>"{transcript}"</Text>

              {parsedCommand && (
                <View style={styles.parsedContainer}>
                  <Text style={styles.label}>Understood as:</Text>
                  <Text style={styles.parsedType}>
                    {parsedCommand.type.toUpperCase()}
                  </Text>

                  {parsedCommand.type === 'task' && (
                    <>
                      <Text style={styles.parsedDetail}>Task: {parsedCommand.name}</Text>
                      {parsedCommand.dueDate && (
                        <Text style={styles.parsedDetail}>Due: {parsedCommand.dueDate}</Text>
                      )}
                    </>
                  )}

                  {parsedCommand.type === 'calorie' && (
                    <>
                      <Text style={styles.parsedDetail}>Meal: {parsedCommand.mealType}</Text>
                      {parsedCommand.calories && (
                        <Text style={styles.parsedDetail}>Calories: {parsedCommand.calories}</Text>
                      )}
                      {parsedCommand.description && (
                        <Text style={styles.parsedDetail}>Food: {parsedCommand.description}</Text>
                      )}
                    </>
                  )}

                  <View style={styles.buttonRow}>
                    <Button
                      mode="outlined"
                      onPress={handleClose}
                      style={styles.actionButton}
                    >
                      Cancel
                    </Button>
                    <Button
                      mode="contained"
                      onPress={handleConfirm}
                      style={styles.actionButton}
                    >
                      Confirm
                    </Button>
                  </View>
                </View>
              )}

              {error && (
                <View style={styles.errorContainer}>
                  <MaterialCommunityIcons name="alert-circle" size={24} color="#d32f2f" />
                  <Text style={styles.errorText}>{error}</Text>
                  <Button
                    mode="outlined"
                    onPress={startListening}
                    style={styles.retryButton}
                  >
                    Try Again
                  </Button>
                </View>
              )}
            </View>
          )}

          {!transcript && !isListening && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Try saying:</Text>
              {getSuggestions().slice(0, 3).map((suggestion, index) => (
                <Text key={index} style={styles.suggestionText}>
                  • "{suggestion}"
                </Text>
              ))}
            </View>
          )}
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  micButton: {
    margin: 0
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    padding: 24,
    borderRadius: 12,
    maxHeight: '80%'
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
    color: '#333'
  },
  listeningContainer: {
    alignItems: 'center',
    paddingVertical: 20
  },
  listeningText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24
  },
  stopButton: {
    minWidth: 120
  },
  resultContainer: {
    marginTop: 8
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  transcript: {
    fontSize: 16,
    color: '#333',
    fontStyle: 'italic',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8
  },
  parsedContainer: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16
  },
  parsedType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8
  },
  parsedDetail: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16
  },
  actionButton: {
    flex: 1
  },
  errorContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 8
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    marginTop: 8,
    marginBottom: 16,
    textAlign: 'center'
  },
  retryButton: {
    minWidth: 120
  },
  suggestionsContainer: {
    marginTop: 8
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12
  },
  suggestionText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 8,
    fontStyle: 'italic'
  }
});
