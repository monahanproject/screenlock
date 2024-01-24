((doc, win, nav) => {
    'use strict';
  
    const SSE_URL = 'https://stream.wikimedia.org/v2/stream/recentchange';
    const soundCheckbox = doc.querySelector('#sound');
  
    let voices = speechSynthesis.getVoices().reduce((acc, voice) => {
      acc[voice.lang.substr(0, 2)] = voice;
      return acc;
    }, {});
  
    speechSynthesis.onvoiceschanged = () => {
      voices = speechSynthesis.getVoices().reduce((acc, voice) => {
        acc[voice.lang.substr(0, 2)] = voice;
        return acc;
      }, {});
    };
  
    const eventSource = new EventSource(SSE_URL);
    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'edit' && !data.bot && data.namespace === 0 && data.wiki !== 'wikidatawiki') {
        const language = data.wiki.replace('wiki', '');
        const voice = voices[language] || voices['en'];
        if (voice && !speechSynthesis.speaking && !speechSynthesis.pending) {
          const utterance = new SpeechSynthesisUtterance(data.title);
          utterance.voice = voice;
          utterance.volume = soundCheckbox.checked ? 1 : 0;
          speechSynthesis.speak(utterance);
        }
      }
    };
  
    soundCheckbox.addEventListener('click', () => {
      if (soundCheckbox.checked && !speechSynthesis.speaking) {
        const testUtterance = new SpeechSynthesisUtterance('Sound is on');
        speechSynthesis.speak(testUtterance);
      }
    });
  
    const wakeLockCheckbox = doc.querySelector('#keep-awake');
    let wakeLockRequest = null;
  
    if (wakeLockCheckbox && 'wakeLock' in nav) {
      wakeLockCheckbox.addEventListener('click', async () => {
        if (wakeLockRequest) {
          wakeLockRequest.cancel();
          wakeLockRequest = null;
        } else {
          try {
            wakeLockRequest = await nav.wakeLock.request('screen');
          } catch (err) {
            console.error('Wake lock could not be activated:', err);
          }
        }
      });
    }
  
  })(document, window, navigator);
