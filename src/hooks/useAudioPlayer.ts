import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';
import audioData from '../../audioData.json';

export interface Phrase {
  words: string;
  time: number;
  speaker: string;
}

interface AudioData {
  pause: number;
  speakers: { name: string; phrases: { words: string; time: number }[] }[];
}

const data: AudioData = audioData;

const flattenPhrases = (): Phrase[] => {
  const phrases: Phrase[] = [];
  const speakers = data.speakers;
  const phraseIndices = Array(speakers.length).fill(0);
  let phrasesAdded = 0;
  const totalPhrases = speakers.reduce((sum, speaker) => sum + speaker.phrases.length, 0);

  while (phrasesAdded < totalPhrases) {
    for (let s = 0; s < speakers.length; s++) {
      const speaker = speakers[s];
      const index = phraseIndices[s];
      if (index < speaker.phrases.length) {
        phrases.push({ ...speaker.phrases[index], speaker: speaker.name });
        phraseIndices[s]++;
        phrasesAdded++;
      }
    }
  }
  return phrases;
};

const calculateCumulativeTimes = (phrases: Phrase[]): number[] => {
  return phrases.map((_, index) =>
    phrases.slice(0, index).reduce((acc, phrase) => acc + phrase.time + data.pause, 0)
  );
};

export const useAudioPlayer = () => {
  const phrases = flattenPhrases();
  const cumulativeTimes = calculateCumulativeTimes(phrases);

  const [currentPhraseIndex, setCurrentPhraseIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [pausedTime, setPausedTime] = useState<number | null>(null);
  const [audioCompleted, setAudioCompleted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.5);
  const [displayedPhrases, setDisplayedPhrases] = useState<Phrase[]>([]);

  useEffect(() => {
    const loadAudio = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/example_audio.mp3'),
          { shouldPlay: false, volume }
        );
        setSound(sound);
      } catch (error) {
        Alert.alert('Error', 'Failed to load audio file');
        console.error(error);
      }
    };

    loadAudio();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (sound) {
      sound.setVolumeAsync(volume);
    }
  }, [volume, sound]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (sound && isPlaying) {
      interval = setInterval(async () => {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.positionMillis !== undefined) {
          const currentTime = status.positionMillis;

          const phraseIndex = cumulativeTimes.findIndex(
            (startTime, i) =>
              currentTime >= startTime &&
              currentTime < startTime + phrases[i].time
          );

          if (phraseIndex !== -1 && phraseIndex !== currentPhraseIndex) {
            setCurrentPhraseIndex(phraseIndex);
          }

          if (
            currentTime >=
            cumulativeTimes[cumulativeTimes.length - 1] + phrases[phrases.length - 1].time
          ) {
            setIsPlaying(false);
            setAudioCompleted(true);
            setCurrentPhraseIndex(0);
          }
        }
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sound, isPlaying, currentPhraseIndex]);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
  };

  const playPhrase = async (index: number, startTime: number) => {
    if (sound) {
      await sound.setPositionAsync(startTime);
      await sound.playAsync();
      setIsPlaying(true);
      setAudioCompleted(false);
      setCurrentPhraseIndex(index);
    }
  };

  const handlePlay = async () => {
    if (audioCompleted) {
      setCurrentPhraseIndex(0);
      setPausedTime(null);
      playPhrase(0, 0);
    } else if (pausedTime !== null) {
      playPhrase(currentPhraseIndex, pausedTime);
      setPausedTime(null);
    } else {
      playPhrase(currentPhraseIndex, cumulativeTimes[currentPhraseIndex]);
    }
  };

  const handlePause = async () => {
    if (sound && isPlaying) {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        setPausedTime(status.positionMillis);
      }
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  const handleRewind = async () => {
    if (sound) {
      const prevIndex = currentPhraseIndex > 0 ? currentPhraseIndex - 1 : 0;
      playPhrase(prevIndex, cumulativeTimes[prevIndex]);
    }
  };

  const handleForward = async () => {
    if (sound && currentPhraseIndex < phrases.length - 1) {
      const nextIndex = currentPhraseIndex + 1;
      playPhrase(nextIndex, cumulativeTimes[nextIndex]);
    }
  };

  const handlePhraseUpdate = (newIndex: number) => {
    setCurrentPhraseIndex(newIndex);
    setDisplayedPhrases(phrases.slice(0, newIndex + 1));
  };

  return {
    phrases,
    currentPhraseIndex,
    isPlaying,
    handlePlay,
    handlePause,
    handleRewind,
    handleForward,
    volume,
    handleVolumeChange,
    displayedPhrases,
    handlePhraseUpdate,
  };
};
