import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useAudioPlayer } from './src/hooks/useAudioPlayer';
import { PhraseList } from './src/components/PhraseList';
import { ControlButtons } from './src/components/ControlButtons';
import SplashScreen from './src/components/SplashScreen';
import VolumeControl from './src/components/VolumeControl';

const App: React.FC = () => {
  const {
    phrases,
    currentPhraseIndex,
    isPlaying,
    handlePlay,
    handlePause,
    handleRewind,
    handleForward,
    volume,
    handleVolumeChange,
  } = useAudioPlayer();
  const [animationCompleted, setAnimationComplete] = useState<Boolean>(false);
  const changeAnimationStatus = (param: Boolean) => {
    setAnimationComplete(param);
  };

  return (
    <SafeAreaView style={styles.container}>
      {!animationCompleted ? (
        <SplashScreen onFinish={changeAnimationStatus} />
      ) : (
        <>
          <PhraseList phrases={phrases} currentPhraseIndex={currentPhraseIndex} />
          <VolumeControl volume={volume} onVolumeChange={handleVolumeChange} />
          <ControlButtons
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onPause={handlePause}
            onRewind={handleRewind}
            onForward={handleForward}
          />

        </>
      )}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
});

export default App;
