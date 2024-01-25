// need to add the credit durations to the duration

console.log("hi");

var myLang = localStorage["lang"] || "defaultValue";
var player;
var audioContext = null;
var volumeNode;
let playerPlayState = "play";
let hasSkippedToEnd = false;
let displayConsoleLog = "<br>";
let curatedTracklistTotalTimeInSecs = 0;
let curatedTracklistTotalTimeInMins;
let curatedTracklist;
let timerDuration = 0;

const MAX_PLAYLIST_DURATION_SECONDS = 1140; //(19m)
// 1140
var totalDurationSeconds = 2140; //(19m)
let currentTimeElement; // Element to display current time
const PREFETCH_BUFFER_SECONDS = 8; /* set how many seconds before a song is completed to pre-fetch the next song */

//  XXXXXXXXXXXXXXXXXXXXXXXX
//  XXXXXX WAKELOCK  XXXXXXX
//  XXXXXXXXXXXXXXXXXXXXXXXX

// Wake lock functionality
const requestWakeLock = async () => {
  if ("wakeLock" in navigator) {
    try {
      const wakeLockRequest = await navigator.wakeLock.request("screen");
      console.log("Wake lock activated.");

      // Re-request the wake lock if the visibility state changes
      document.addEventListener("visibilitychange", async () => {
        if (document.visibilityState === "visible" && !wakeLockRequest) {
          wakeLockRequest = await navigator.wakeLock.request("screen");
          console.log("Wake lock re-activated.");
        }
      });
    } catch (err) {
      console.error("Wake lock could not be activated:", err);
    }
  } else {
    console.warn("Wake lock API not available.");
  }
};

// Request wake lock on page load
requestWakeLock();


//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//  XXXXXX SET UP THE PLAYER  XXXXXXX
//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

player = document.getElementById("music_player");
player.controls = false;

const playButton = document.getElementById("play-button");
var svgContainer = document.getElementById("play-button-svg-container");
var textContainer = document.getElementById("play-button-text-container");
const playIcon = document.getElementById("play-icon");
const pauseIcon = document.getElementById("pause-icon");
const skipBackwardButton = document.getElementById("skipBackwardButton");
const skipForwardButton = document.getElementById("skipForwardButton");
const trackNameContainer = document.getElementById("playerTrackNameContainer");

function createVolumeSlider() {
  const volumeSlider = document.getElementById("volume-slider");
  if (volumeSlider) {
    // Check if the element exists
    volumeSlider.type = "range";
    volumeSlider.max = "100";
    volumeSlider.min = "0";
    volumeSlider.value = "75"; // Set this to your preferred starting value, e.g., 75 for 75%
  }
  return volumeSlider;
}
const volumeSlider = createVolumeSlider();
function createAudioElement(id) {
  const audio = document.createElement("audio");
  audio.id = id;
  return audio;
}

function handleVolumeChange(event) {
  if (volumeNode !== undefined) {
    const newVolume = parseFloat(event.target.value) / 100;
    volumeNode.gain.value = newVolume;
  }
}

if (volumeSlider) {
  volumeSlider.addEventListener("change", handleVolumeChange);

  // Initialize the volume to the slider's starting value when the page loads
  document.addEventListener("DOMContentLoaded", () => {
    handleVolumeChange({ target: { value: volumeSlider.value } });
  });
}

let isUpdatingTime = false; // Flag to prevent rapid updates

function handleSkipForwardClick() {
  let newPlayerTime = player.currentTime + 20;
  newPlayerTime = Math.min(newPlayerTime, totalDurationSeconds);
  if (!isUpdatingTime) {
    isUpdatingTime = true; // Set a flag to prevent rapid updates
    setTimeout(() => {
      player.currentTime = newPlayerTime;
      isUpdatingTime = false;
    }, 20); // Adjust the delay as needed (100 milliseconds in this case)
  }
}

function handleSkipBackwardClick() {
  let newPlayerTime = player.currentTime - 20;
  newPlayerTime = Math.min(newPlayerTime, totalDurationSeconds);
  if (!isUpdatingTime) {
    isUpdatingTime = true; // Set a flag to prevent rapid updates
    setTimeout(() => {
      player.currentTime = newPlayerTime;
      isUpdatingTime = false;
    }, 20); // Adjust the delay as needed (100 milliseconds in this case)
  }
}

// const trackNameElement = createTrackNameElement();
playButton.addEventListener("click", handlePlayPauseClick);
skipBackwardButton.addEventListener("click", handleSkipBackwardClick);
skipForwardButton.addEventListener("click", handleSkipForwardClick);
volumeSlider.addEventListener("change", handleVolumeChange);

// https://css-tricks.com/lets-create-a-custom-audio-player/
function createHTMLMusicPlayer() {}

//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//  XXXXXXXXXXX  TIMER  XXXXXXXXXXXXX
//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

function updateProgressTimerr(elapsedSeconds, previousDuration) {
  const progressBar = document.getElementById("progress-bar");
  const progressDot = document.getElementById("progress-dot");
  const timePlayedElement = document.getElementById("time-played");
  const timeRemainingElement = document.getElementById("time-remaining");

  if (!timePlayedElement || !timeRemainingElement || !progressBar || !progressDot) {
    console.error("Error: Missing elements");
    return;
  }

  totalDurationSeconds = curatedTracklistTotalTimeInSecs;
  const remainingDurationSeconds = totalDurationSeconds - (elapsedSeconds + previousDuration);

  // Calculate the percentage of the track that's been played
  const playedPercentage = ((elapsedSeconds + previousDuration) / totalDurationSeconds) * 100;

  // Update the progress bar and dot
  progressBar.style.width = `${playedPercentage}%`;
  progressDot.style.left = `calc(${playedPercentage}% - 5px)`; // Adjust based on the dot's size

  // Update the time labels
  const playedTime = calculateMinutesAndSeconds(elapsedSeconds + previousDuration);
  const remainingTime = calculateMinutesAndSeconds(remainingDurationSeconds);

  timePlayedElement.innerText = `${playedTime.minutes}:${playedTime.seconds}`;
  timeRemainingElement.innerText = `-${remainingTime.minutes}:${remainingTime.seconds}`;
}

function handleTimerCompletion() {
  const timeRemainingElement = document.getElementById("time-remaining");

  if (!timeRemainingElement) {
    console.error("Error: Missing element 'time-remaining'");
    return; // Exit the function to prevent further errors
  }
  timeRemainingElement.innerHTML = "Done";
}

function calculateMinutesAndSeconds(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toLocaleString("en-US", {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });
  return { minutes, seconds: remainingSeconds };
}

function calculateRemainingTime(elapsedSeconds) {
  return totalDurationSeconds - elapsedSeconds;
}

function createTimerLoopAndUpdateProgressTimer() {
  var start = Date.now(); // Record the start time of the loop
  return setInterval(() => {
    let delta = Date.now() - start; // Calculate elapsed milliseconds
    let deltaSeconds = Math.floor(delta / 1000); // Convert milliseconds to seconds
    // findmeeee
    updateProgressTimerr(Math.floor(player.currentTime), timerDuration);
    remainingTime = calculateRemainingTime(deltaSeconds);
  }, 1000); // Run the loop every x milliseconds
}

//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//  XXXXXXXXX generate player  XXXXXXXXXX
//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

function generatePlayer() {}

// Function to create an audio element
function createAudioElement(url) {
  const audio = new Audio();
  audio.preload = "none";
  audio.src = url;
  audio.controls = false;
  return audio;
}

function updateTheStatusMessage(element, message) {
  element.innerHTML = message;
}

function removeAnElementByID(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.remove();
  }
}

//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//  XXXXX AUDIO CACHING SO WE DOWNLOAD SONGS AS WE GO XXXXXX
//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

/* fetchAndCacheAudio takes an audioFileUrl and a cache object as input. The 
function checks if the audio file is already in the cache, and if not, fetches it from the network, 
adds it to the cache, and returns the audio response. */

function fetchAndCacheAudio(audioFileUrl, cache) {
  // Check first if audio is in the cache.
  return cache.match(audioFileUrl).then((cacheResponse) => {
    // return cached response if audio is already in the cache.
    if (cacheResponse) {
      return cacheResponse;
    }
    // Otherwise, fetch the audio from the network.
    return fetch(audioFileUrl).then((networkResponse) => {
      // Add the response to the cache and return network response in parallel.
      cache.put(audioFileUrl, networkResponse.clone());
      return networkResponse;
    });
  });
}
//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//  XXXXXXX CREATE EACH SONG! XXXXXXXXX
//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

/* Takes a song object as input, create an audio element for the song's URL, 
assignS it to the song.audio property, and returns the modified song object.*/

const addAudioFromUrl = (song) => {
  song.audio = createAudioElement(song.url);
  return song;
};

//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//  XXXXX CREATE OUTRO AUDIO! XXXXXX
//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

/* Define two more arrays outroAudioSounds and finalOutroAudioSounds, each containing an object
   representing an outro track. Each object is processed using the addAudioFromUrl function. */

const outroAudioSounds = [
  {
    name: "OUTRO2PT1SOLO",
    url: "./sounds/INTRO_OUTRO_NAMES/OUTRO_2.1.mp3",
    duration: 6,
    author: "",
    form: "",
    placement: [""],
    length: "",
    language: "",
    sentiment: "",
    tags: ["outro"],
    backgroundMusic: "",
    credit: "",
    engTrans: "[TODO.]",
    frTrans: "[TODO.]",
  },
].map(addAudioFromUrl);

const finalOutroAudioSounds = [
  {
    name: "OUTRO2PT2withMUSIC",
    url: "./sounds/INTRO_OUTRO_NAMES/OUTRO_2.2_MUSIC.mp3",
    duration: 6,
    author: "",
    form: "",
    placement: [""],
    length: "",
    language: "",
    sentiment: "",
    tags: ["outro"],
    backgroundMusic: "",
    credit: "",
  },
].map(addAudioFromUrl);

//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//  XXXXX GET OUR SONGS & TURN THEM INTO SONG OBJECTS! XXXXXX
//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

/* 5. Define an array SONGS containing multiple song objects, each song object is 
  processed using the addAudioFromUrl function. */

let songs; // Initialize SONGS with the data

// Load JSON data from the file
fetch("songs.json")
  .then((response) => response.json())
  .then((data) => {
    // Use the JSON data in your script
    songs = data.map(addAudioFromUrl);
    // ...
  })
  .catch((error) => {
    console.error("Error loading JSON data:", error);
  });

//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//  XXXXXXXXXXX CREDITS STUFF XXXXXXXXXXXXX
//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

let arrayOfCreditSongs = [];
let creditsLog = [];

function addToCreditsLog(songCredit) {
  const strippedCredit = songCredit.substring(songCredit.lastIndexOf("_") + 1);
  creditsLog.push(`${strippedCredit}<br>`);
}

function createCreditObjectAndAddToArray(song) {
  const creditObj = {
    name: song.name,
    url: song.credit, //flip on purpose
    duration: "2",
    author: song.author,
    form: "",
    placement: [""],
    length: "",
    language: "",
    sentiment: "",
    backgroundMusic: "",
    tags: [""],
    credit: song.url,
  };
  arrayOfCreditSongs.push(addAudioFromUrl(creditObj));
}

function gatherTheCreditSongs(curatedTracklist) {
  for (let index = 0; index < curatedTracklist.length; index++) {
    const song = curatedTracklist[index];

    const songTitles = arrayOfCreditSongs.map((song) => song.credit).join(", ");

    if (song.credit == "") {
      // No credit information, do nothing
    } else {
      const matchingCreditSong = trackExistsWithAttributes(arrayOfCreditSongs, "url", song.credit);

      if (matchingCreditSong) {
        // Matching credit song found, do nothing
      } else {
        addToCreditsLog(song.credit);
        createCreditObjectAndAddToArray(song);
        // Credit being added
      }
    }

    // curatedTracklistTotalTimeInSecs = calculateOrUpdatecuratedTracklistDuration(song, curatedTracklist);
    // console.log(`adding credit, gopefully song is ${song}, hopefully song duration is ${song.duration}`);
  }
  return arrayOfCreditSongs;
}

//////////////////////////////////////
////////// TRANSCRIPT STUFF //////////
/////////////////////////////////////

// Global variables
let transcript = ""; // Store the transcript
let language = "english"; // Default language
let transcriptVisible = false; // Track visibility of transcript
let transcriptContent; // Define transcriptContent as a global variable
const transcriptContainer = document.getElementById("transcriptContainer"); // Moved to global scope

// Helper function to create elements with attributes
function createElement(type, attributes) {
  const element = document.createElement(type);
  Object.keys(attributes).forEach((attr) => (element[attr] = attributes[attr]));
  return element;
}

// Function to create the transcript container and button
function createTranscriptContainer() {
  if (!transcriptContainer) {
    console.error("Transcript container not found.");
    return;
  }
  const transcriptButton = createElement("button", {
    type: "button",
    className: "btn",
    id: "transcriptButton",
    textContent: "TRANSCRIPT",
  });

  const transBtnContainer = document.getElementById("transButtonContainer");
  transBtnContainer.appendChild(transcriptButton);
  transcriptButton.addEventListener("click", toggleTranscript);
  // Initialize transcriptContent here to avoid re-declaration later
  transcriptContent = createElement("div", { id: "transcriptContent", style: "display: none" });
  transcriptContainer.appendChild(transcriptContent); // Append to the container
}

// Function to apply formatting to text
function formatText(text) {
  const formatPatterns = {
    bold: /\^([^]+?)\^\^/g,
    center: /@([^]+?)@@/g,
    italics: /\$([^]+?)\$\$/g,
    lineBreak: /%/g,
    doubleLineBreak: /\*/g,
  };

  return text
    .replace(formatPatterns.bold, '<span style="font-weight: bold;">$1</span>')
    .replace(formatPatterns.center, '<span style="display: block; text-align: center;">$1</span>')
    .replace(formatPatterns.italics, '<span style="font-style: italic;">$1</span>')
    .replace(formatPatterns.lineBreak, "</br>")
    .replace(formatPatterns.doubleLineBreak, "<p></br></br></p>");
}

function createHTMLFromText(text) {
  const container = createElement("div", {});
  const currentParagraph = createElement("p", {
    style: "margin-top: 3rem; margin-bottom: 4rem; padding: 1rem; background-color: #f0ebf8; margin-left: 0; margin-right: 0;",
  });

  try {
    currentParagraph.innerHTML = formatText(text); // Refactored to formatText function
    container.appendChild(currentParagraph);
  } catch (error) {
    console.error("Error while processing input text:", error);
  }

  return container;
}

// Function to update the transcript based on the selected language
function updateTranscript() {
  if (!transcriptContainer) {
    console.error("Transcript container not found.");
    return;
  }

  transcriptContainer.innerHTML = ""; // Clear previous content

  const langKey = language === "english" ? "engTrans" : "frTrans";
  const copyRightText =
    language === "english"
      ? "$All recordings and transcripts are copyright protected. All rights reserved.$$"
      : "$Les enregistrements et les transcriptions sont protégés par le droit d’auteur. Tous droits réservés.$$";

  curatedTracklist.forEach((song) => {
    const inputString = song[langKey];
    if (inputString && inputString.trim() !== "") {
      transcriptContainer.appendChild(createHTMLFromText(inputString));
    }
  });

  transcriptContainer.appendChild(createHTMLFromText(copyRightText));
  transcriptContainer.style.display = "block";
}

// Function to toggle the transcript visibility
function toggleTranscript() {
  const transcriptButton = document.getElementById("transcriptButton");

  transcriptVisible = !transcriptVisible; // Toggle the flag first for more predictable logic
  if (transcriptVisible) {
    updateTranscript(); // Update before showing
    transcriptContainer.style.display = "block";
    transcriptButton.textContent = "Hide Transcript";
  } else {
    transcriptContainer.style.display = "none";
    transcriptButton.textContent = "Show Transcript";
  }
}

//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  ~~~~~~ TRACKLIST CREATION ~~~~~~~
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//  XXXXXXXX ✉️ GENERAL RULES XXXXXXXXXX
//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

let r10rule = "The current track must have a different author than the last track";
let r11rule = "No more than two tracks from the same author in a tracklist";
let r12rule = "Tracks with the form short and the language musical can never follow tracks with the form music";
let r13rule = "Tracks with the form music can never follow tracks with both the form short and the language musical";
let r14rule =
  "The value for backgroundMusic should never match the author of the track right before it, and the author of the track should never match the backgroundMusic of the track right before it";
let r15rule = "If the previous track has the sentiment heavy, this track cannot have the the laughter tag";
let r16rule = "If the previous track has length long and form music, this track must have the form interview or poetry";

// let r60rule = "the 0th track must have the placement end (we'll be moving this to the end)";
let r61rule = "the 1st track must have the tag 'intro'";
let r62rule = "the 2nd track must have the placement 'beginning'";
let r63rule = "the 3rd track must have the placement beginning and a different form than the 2nd track";
let r64rule = "the 4th track must have the placement middle and a different form than the 3rd track";
let r65rule = "the 5th track must have the length 'short'; must have the placement 'middle'; and have a different form than the 4th track";
let r66rule = "the 6th track must have the placement 'middle' and a different form than the 5th track";
let r67rule = "the 7th track must have the placement 'middle' and a different form than the 6th track";
let r68rule = "the 8th track must have the placement 'middle', a different form than previous track";

let r21rule = "minimum one track with the author ALBERT";
let r22rule = "minimum one track with the author PIERREELLIOTT";
let r23rule = "minimum one track with the form interview";
let r24rule = "minimum one track with the form music";

let r25rule = "The tracklist cannot contain one track with the tag 'geese'";

// R10: The current track must have a different author than the last track
function r10(track, prevTrack1, prevTrack2, curatedTracklist, currIndex) {
  const trackName = track.name;
  const ruleType = `✉️ General rule:`;
  const logMessage = `The current track must have a different author (${track.author}) than the previous track (${prevTrack1.author})`;
  if (prevTrack1 && track.author === prevTrack1.author) {
    logRuleApplication(10, track.name, logMessage, false, ruleType);
    return false;
  }
  logRuleApplication(10, logMessage, true, ruleType);
  return true;
}
// R11: No more than two tracks from the same author in a tracklist
function r11(track, prevTrack1, prevTrack2, curatedTracklist, currIndex) {
  const trackName = track.name;
  const ruleType = `✉️ General rule:`;

  // Adjust the count based on whether the track is being added for the first time
  const isNewAddition = !curatedTracklist.some((t) => t.name === track.name);
  const authorCount = curatedTracklist.filter((t) => t.author.trim() === track.author.trim()).length + (isNewAddition ? 1 : 0);

  // If there are already 2 or more tracks from the same author before this track, log a rule violation
  if (authorCount > 2) {
    const violatingTracks = curatedTracklist
      .filter((t) => t.author === track.author)
      .map((t) => t.name)
      .join(", ");
    const logMessage = `No more than two tracks from the same author (${track.author}) allowed in a tracklist. Violating tracks are: ${violatingTracks}`;
    logRuleApplication(11, track.name, logMessage, false, ruleType);
    return false;
  }
  // If the condition is met (no rule violation), log successful rule application
  const logMessage = `No more than two tracks from the same author (${track.author}) allowed in a tracklist.`;
  logRuleApplication(11, logMessage, true, ruleType);
  return true;
}

// R12: Tracks with the form short and the language musical can never follow tracks with the form music.
function r12(track, prevTrack1, prevTrack2, curatedTracklist, currIndex) {
  const trackName = track.name;
  const ruleType = `✉️ General rule:`;
  const logMessage = `Tracks with form 'short' and language 'musical' (track's form is ${track.form}) and language (track's language is ${track.language}) cannot follow tracks with form 'music' (last track's form is ${prevTrack1.form})`;

  if (track.form === "short" && track.language === "musical" && prevTrack1.form === "music") {
    logRuleApplication(12, track.name, logMessage, false, ruleType);
    return false;
  }
  // If the condition is not met, return true to indicate rule followed
  logRuleApplication(12, logMessage, true, ruleType);
  return true;
}
// R13: Tracks with the form music can never follow tracks with BOTH the form short AND the language musical.
function r13(track, prevTrack1, prevTrack2, curatedTracklist, currIndex) {
  const trackName = track.name;
  const ruleType = `✉️ General rule:`;
  const logMessage = `Tracks with form 'music' (track's form ${track.form}) cannot follow tracks with form 'short' and language 'musical' (last track's form was ${prevTrack1?.form} and language was ${prevTrack1?.language})`;

  if (track.form === "music" && prevTrack1 && prevTrack1.form === "short" && prevTrack1.language === "musical") {
    logRuleApplication(13, trackName, false, ruleType, logMessage);
    return false; // Rule is violated if the current track is music and previous track is short and musical
  }
  // If the condition is not met, return true to indicate rule followed
  logRuleApplication(13, trackName, true, ruleType, logMessage);
  return true;
}

// R14: The value for backgroundMusic should never match the author of the track right before it, and the author of the track should never match the backgroundMusic of the track right before it.
function r14(track, prevTrack1, prevTrack2, curatedTracklist, currIndex) {
  // Safe checks for undefined properties
  const trackBackgroundMusic = track.backgroundMusic || "";
  const trackAuthor = track.author || "";
  const prevTrackAuthor = prevTrack1 && prevTrack1.author ? prevTrack1.author.trim() : "";
  const prevTrackBackgroundMusic = prevTrack1 && prevTrack1.backgroundMusic ? prevTrack1.backgroundMusic.trim() : "";

  // Log message setup
  const trackName = track.name;
  const ruleType = "✉️ General rule:";
  const logMessage = `Track (${trackName}): The background music ('${trackBackgroundMusic}') should not match the author of the previous track ('${prevTrackAuthor}'), and the author ('${trackAuthor}') should not match the background music of the previous track ('${prevTrackBackgroundMusic}')`;

  // Check if the backgroundMusic of the current track matches the author of the previous track
  const backgroundMusicViolation = trackBackgroundMusic !== "" && trackBackgroundMusic === prevTrackAuthor;

  // Check if the author of the current track matches the backgroundMusic of the previous track
  const authorViolation = trackAuthor !== "" && trackAuthor === prevTrackBackgroundMusic;

  if (prevTrack1 && (backgroundMusicViolation || authorViolation)) {
    logRuleApplication(14, trackName, logMessage, false, ruleType); // Log rule violation
    return false; // Rule violation
  }

  logRuleApplication(14, trackName, logMessage, true, ruleType); // Log rule followed
  return true; // Rule followed
}

// R15: If the previous track has the sentiment heavy, this track cannot have the the laughter tag.
function r15(track, prevTrack1, prevTrack2, curatedTracklist, currIndex) {
  const trackName = track.name;
  const ruleType = `✉️ General rule:`;
  const logMessage = `If the previous track has the sentiment heavy (previous track's sentiment is ${prevTrack1.sentiment}), this track cannot have the laughter tag (track's tags are ${track.tags})`;
  if (track.tags.includes("laughter") && prevTrack1.sentiment === "heavy") {
    logRuleApplication(15, track.name, logMessage, false, ruleType);
    return false;
  }
  // If the condition is not met, return true to indicate rule followed
  logRuleApplication(15, logMessage, true, ruleType);
  return true;
}
// R16: If the previous track has length long and form music, this track must have the form interview or poetry`;
function r16(track, prevTrack1, prevTrack2, curatedTracklist, currIndex) {
  const trackName = track.name;
  const ruleType = `✉️ General rule:`;
  const logMessage = `If the previous track has length 'long' and form 'music' (previous track's length is ${prevTrack1.length} and form is ${prevTrack1.form}), this track must have the form 'interview' or 'poetry' (current track's form is ${track.form})`;

  if (prevTrack1 && prevTrack1.length === "long" && prevTrack1.form === "music") {
    // findme
    if (track.form !== "interview" && track.form !== "poetry") {
      logRuleApplication(16, track.name, logMessage, false, ruleType);
      return false; // Rule is broken if the current track is not an interview.
    }
  }
  // If the rule is not violated or does not apply, return true and log.
  logRuleApplication(16, logMessage, true, ruleType);
  return true;
}

let geeseTrackCounter = 0;
function r25(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex) {
  const ruleType = `👀 Ensure rule:`;
  geeseTracks = curatedTracklist.filter((t) => t.tags && t.tags.includes("geese"));
  geeseTrackCounter = geeseTracks.length;

  // Create a log message for the current state
  let logMessage = `Checking 'geese' tag rule at track index ${trackIndex}. Number of tracks with 'geese': ${geeseTrackCounter.length}.`;

  // If exactly one 'geese' track is found, check the condition based on the current track
  if (geeseTrackCounter.length === 1) {
    if (track.tags && track.tags.includes("geese")) {
      geeseTrackCounter += 1;
      console.log(`${ruleType} Acceptable number of 'geese' tracks found. Count: ${geeseTrackCounteeer.length}`);
      logRuleApplication(25, track.name, true, ruleType, logMessage);
      return true; // Rule is passed if the current track has 'geese' tag
    } else {
      console.log(`${ruleType} Rule c25 violated: Exactly one track with the tag 'geese' found, which is not acceptable.`);
      logRuleApplication(25, track.name, false, ruleType, logMessage);
      return false; // Rule is failed if the current track does not have 'geese' tag
    }
  }

  // Log the state if the rule is not violated
  logRuleApplication(25, track.name, true, ruleType, logMessage);
  return true; // Default return true
}

//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//  XXXXXXXX 📙 Specific track rules (TRACKS 1-8) XXXXXXXXXX
//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

// R00: Rule 0 (only for Track 0): The Oth track must have the placement end (we'll be moving this to the end).
// function r60(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex) {
//   const trackName = track.name;
//   const ruleType = `📙 Base track rule:`;
//   const logMessage = `${track.name} The 0th (eventually final) track includes the placement end (placement ${track.placement})`;

//   if (trackIndex === 0 && !track.placement.includes("end")) {
//     logRuleApplication(60, track.name, logMessage, false, ruleType);
//     return false;
//   }
//   // If the conditions are met, return true to indicate rule followed
//   logRuleApplication(60, logMessage, true, ruleType);
//   return true;
// }

// R61: Rule 1 (only for Track 1): The 1st track must have the tag 'intro'.
function r61(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex) {
  const trackName = track.name;
  const ruleType = `📙 Base track rule:`;
  const logMessage = `${track.name} The track's index is ${trackIndex}. The 1st track must have the tag intro (track's tags are ${track.tags})`;

  if (trackIndex === 1 && !track.tags.includes("intro")) {
    logRuleApplication(61, track.name, logMessage, false, ruleType);
    return false;
  }
  // If the conditions are met, return true to indicate rule followed
  logRuleApplication(61, logMessage, true, ruleType);
  return true;
}

// R62: Rule 2 (only for Track 2):The 2nd track must have the placement 'beginning'.
function r62(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex) {
  const trackName = track.name;
  const ruleType = `📙 Base track rule:`;
  const logMessage = `${track.name} The track's index is ${trackIndex}. The 2nd track must have the placement beginning (track's placement is ${track.placement})`;

  if (trackIndex === 2 && !track.placement.includes("beginning")) {
    logRuleApplication(62, track.name, logMessage, false, ruleType);
    return false;
  }
  logRuleApplication(62, logMessage, true, ruleType);
  return true;
}

// R63: Rule 3 (only for Track 3): The 3rd track must have the placement beginning and a different form than the 2nd track.
function r63(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex) {
  const trackName = track.name;
  const ruleType = `📙 Base track rule:`;
  const logMessage = `${track.name} The track's index is ${trackIndex}. The 3rd track must have the placement beginning (track's placement is ${track.placement}) and a different form (track's form is ${track.form}) than the 2nd track (the 2nd track's form is ${prevTrack1.form})`;

  if ((trackIndex === 3 && !track.placement.includes("beginning")) || (trackIndex === 3 && track.form === prevTrack1.form)) {
    logRuleApplication(63, track.name, logMessage, false, ruleType);
    return false;
  }
  logRuleApplication(63, logMessage, true, ruleType);
  return true;
}

// R64: Rule 4 (only for Track 4): The 4th track must have the placement middle and a different form than the 3rd track.
function r64(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex) {
  const trackName = track.name;
  const ruleType = `📙 Base track rule:`;
  const logMessage = `${track.name} The track's index is ${trackIndex}. The 4th track must have the placement middle (track's placement is ${track.placement}); and a different form (track's form is ${track.form}); than the 3rd track (the 3rd track's form is ${prevTrack1.form})`;

  if ((trackIndex === 4 && !track.placement.includes("middle")) || (trackIndex === 4 && track.form === prevTrack1.form)) {
    logRuleApplication(64, track.name, logMessage, false, ruleType);
    return false;
  }
  logRuleApplication(64, logMessage, true, ruleType);
  return true;
}

// R65: Rule 5 (only for Track 5): The 5th track must have the length 'short'; must have the placement 'middle'; and have a different form than the 4th track.
function r65(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex) {
  const trackName = track.name;
  const ruleType = `📙 Base track rule:`;
  const logMessage = `${track.name} The track's index is ${trackIndex}. The 5th track must have the length short (track's length is ${track.length}); must have the placement MIDDLE (track's placement is ${track.placement}); and a different form (track's form is ${track.form}) from the 4th track (the 4th track's form is ${prevTrack1.form})`;

  if (
    (trackIndex === 5 && track.length !== "short") ||
    (trackIndex === 5 && !track.placement.includes("middle")) ||
    (trackIndex === 5 && track.form === prevTrack1.form)
  ) {
    logRuleApplication(65, track.name, logMessage, false, ruleType);
    return false;
  }
  logRuleApplication(65, logMessage, true, ruleType);
  return true;
}

// R66: Rule 6 (only for Track 6): The 6th track must have the placement 'middle' and a different form than the 5th track.
function r66(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex) {
  const trackName = track.name;
  const ruleType = `📙 Base track rule:`;
  const logMessage = `The track's index is ${trackIndex}. The 6th track has the placement MIDDLE (track's placement is ${track.placement}); and has a different form (track's form is ${track.form}) vs the 5th track (the 5th's track's form is ${prevTrack1.form})`;

  if (trackIndex === 6 && !track.placement.includes("middle")) {
    logRuleApplication(66, track.name, logMessage, false, ruleType);
    return false;
  }
  if (trackIndex === 6 && track.form === prevTrack1.form) {
    logRuleApplication(66, track.name, logMessage, false, ruleType);
    return false;
  }
  logRuleApplication(66, logMessage, true, ruleType);
  return true;
}

// R67: Rule 7 (only for Track 7): The 7th track must have the placement 'middle' and a different form than the 6th track
function r67(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex) {
  const trackName = track.name;
  const ruleType = `📙 Base track rule:`;
  const logMessage = `${track.name} The track's index is ${trackIndex}. The 7th track must have the placement MIDDLE (track's placement is ${track.placement}) and has a different form (track's form is ${track.form}) vs the 6th track (the 6th track's form is ${prevTrack1.form}); AND unless the form of the 7th track is MUSIC (the 7th track's form is ${track.form}), the 7th track also has a different language (the 7th track's language is ${track.language}) from the 6th track (the 6th track's language is ${prevTrack1.language})`;

  if (trackIndex === 7 && (!track.placement.includes("middle") || (track.form === prevTrack1.form && track.form !== "music"))) {
    logRuleApplication(67, track.name, logMessage, false, ruleType);
    return false;
  }
  if (trackIndex === 7 && track.form === prevTrack1.form) {
    logRuleApplication(67, track.name, logMessage, false, ruleType);
    return false;
  }
  logRuleApplication(67, logMessage, true, ruleType);
  return true;
}

// R68: Rule 8 (only for Track 8): The 8th track must have the placement 'middle', a different form than previous track
function r68(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex) {
  const trackName = track.name;
  const ruleType = `📙 Base track rule:`;
  const logMessage = `${track.name} The track's index is ${trackIndex}. The 8th track must have the placement MIDDLE (track's placement is ${track.placement}); and a different form (track's form is ${track.form}) vs the 7th track (the 7th track's form is ${prevTrack1.form}) or 6th track (the 6th track's form is ${prevTrack2.form}); and has a different language (track's language is ${track.language}) vs the 7th track (the 7th track's language is ${prevTrack1.language}) or the 6th track (the 6th track's language is ${prevTrack2.language})`;

  if (trackIndex === 8 && (!track.placement.includes("middle") || (track.form === prevTrack1.form && track.form !== "music"))) {
    logRuleApplication(68, track.name, logMessage, false, ruleType);
    return false;
  }
  if (trackIndex === 8 && track.form === prevTrack1.form) {
    logRuleApplication(68, track.name, logMessage, false, ruleType);
    return false;
  }
  logRuleApplication(68, logMessage, true, ruleType);
  return true;
}

//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//  XXXXXXXX ENSURE RULES (NEAR THE END) XXXXXXX
//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

// R21. The tracklist must contain at least one track with the author ALBERT.
function r21(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex) {
  const trackName = track.name;
  const ruleType = `👀 Ensure rule:`;
  const logMessage = `✨ ${track.name}: Ensure track rule: The tracklist must contain at least one track with the author ALBERT (track's name is ${track.name}, track's author is ${track.author})`;

  if (track.author != "ALBERT") {
    logRuleApplication(21, track.name, logMessage, false, ruleType);
    return false;
  }
  logRuleApplication(21, logMessage, true, ruleType);
  return true;
}

// R22. The tracklist must contain at least one track with the author PIERREELLIOTT.
function r22(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex) {
  const trackName = track.name;
  const ruleType = `👀 Ensure rule:`;
  const logMessage = `Ensure track rule: The tracklist must contain at least one track with the author PIERREELLIOTT (track's name is ${track.name}, track's author is ${track.author})`;

  if (track.author !== "PIERREELLIOTT") {
    logRuleApplication(22, track.name, logMessage, false, ruleType);
    return false;
  }
  logRuleApplication(22, logMessage, true, ruleType);
  return true;
}

// R23. The tracklist must contain at least one track with the form interview.
function r23(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex) {
  const trackName = track.name;
  const ruleType = `👀 Ensure rule:`;
  const logMessage = ` Ensure track rule: The tracklist must contain at least one track with the form interview (track's name is ${track.name}, track's form is ${track.form})`;

  if (track.form !== "interview") {
    logRuleApplication(23, track.name, logMessage, false, ruleType);
    return false;
  }
  logRuleApplication(23, logMessage, true, ruleType);
  return true;
}

// R24. The tracklist must contain at least one track with the form music.
function r24(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex) {
  const trackName = track.name;
  const ruleType = `👀 Ensure rule:`;
  const logMessage = `Ensure track rule: The tracklist must contain at least one track with the form music (track's name is ${track.name}, track's form is ${track.form})`;

  if (track.form !== "music") {
    logRuleApplication(24, track.name, logMessage, false, ruleType);
    return false;
  }
  logRuleApplication(24, logMessage, true, ruleType);
  return true;
}

//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//  XXXXXXXX 👀 ENSURE CHECKS (NEAR THE END) XXXXXXX
//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

// Rule C21 The tracklist must contain at least one track with the author ALBERT
function c21(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex) {
  const trackName = track.name;
  const ruleType = `👀 Ensure rule:`;

  let trackWithAttribute = trackExistsWithAttributes(curatedTracklist, "author", "ALBERT");
  if (!trackWithAttribute) {
    const logMessage = `The tracklist must contain at least one track with the author ALBERT `;
    logRuleApplication(21, track.name, logMessage, false, ruleType);
    return false;
  }
  const logMessage = `The tracklist must contain at least one track with the author ALBERT (trackWithAttribute is ${trackWithAttribute.name}, author is ${trackWithAttribute.author})`;
  logRuleApplication(21, logMessage, true, ruleType);
  return true;
}

// Rule C22 The tracklist must contain at least one track with the author PIERREELLIOTT
function c22(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex) {
  const trackName = track.name;
  const ruleType = `👀 Ensure rule:`;
  const logMessage = `✨ Ensure track rule: The tracklist must contain at least one track with the author PIERREELLIOTT (trackWithAttribute is ${trackWithAttribute.name}, author is ${trackWithAttribute.author})`;

  let trackWithAttribute = trackExistsWithAttributes(curatedTracklist, "author", "PIERREELLIOTT");
  if (!trackWithAttribute) {
    logRuleApplication(22, track.name, logMessage, false, ruleType);
    return false;
  }
  logRuleApplication(22, logMessage, true, ruleType);
  return true;
}

// Rule C23 The tracklist must contain at least one track with the form interview
function c23(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex) {
  const trackName = track.name;
  const ruleType = `👀 Ensure rule:`;

  let trackWithAttribute = trackExistsWithAttributes(curatedTracklist, "form", "interview");
  if (!trackWithAttribute) {
    const logMessage = `Ensure track rule: The tracklist must contain at least one track with the form interview`;
    logRuleApplication(23, track.name, logMessage, false, ruleType);
    return false;
  }
  const logMessage = `✨ Ensure track rule: The tracklist must contain at least one track with the form interview (trackWithAttribute is ${trackWithAttribute.name}, form is ${trackWithAttribute.form})`;
  logRuleApplication(23, logMessage, true, ruleType);
  return true;
}

// Rule C24 The tracklist must contain at least one track with the form music
function c24(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex) {
  const trackName = track.name;
  const ruleType = `👀 Ensure rule:`;

  let trackWithAttribute = trackExistsWithAttributes(curatedTracklist, "form", "music");

  if (!trackWithAttribute) {
    const logMessage = `Ensure track rule: The tracklist must contain at least one track with the form music`;
    logRuleApplication(24, track.name, logMessage, false, ruleType);
    return false;
  }
  const logMessage = ` ✨! Ensure track rule: The tracklist must contain at least one track with the form music (trackWithAttribute is ${trackWithAttribute.name}, form is ${trackWithAttribute.form})`;
  logRuleApplication(24, logMessage, true, ruleType);
  return true;
}

//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//  XXXXX HELPER FUNCTIONS (DURATION) XXXXXX
//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

function addTrackDurationToTotal(totalTimeInSecs, track) {
  return totalTimeInSecs + (track.duration || 0);
}

function calculateOrUpdatecuratedTracklistDuration(track, curatedTracklist) {
  if (curatedTracklistTotalTimeInSecs === 0) {
    for (const track of curatedTracklist) {
      curatedTracklistTotalTimeInSecs = addTrackDurationToTotal(curatedTracklistTotalTimeInSecs, track);
    }
  } else if (track) {
    curatedTracklistTotalTimeInSecs = addTrackDurationToTotal(curatedTracklistTotalTimeInSecs, track);
  }

  curatedTracklistTotalTimeInMins = Math.floor(curatedTracklistTotalTimeInSecs / 60);

  return curatedTracklistTotalTimeInSecs;
}

function getFinalcuratedTracklistDuration(curatedTracklist) {
  let curatedTracklistTotalTimeInSecs = 0;

  if (!Array.isArray(curatedTracklist)) {
    console.error("Error: curatedTracklist is not an array");
    return curatedTracklistTotalTimeInSecs;
  }

  for (const track of curatedTracklist) {
    console.log("Track name is " + track.name);
    curatedTracklistTotalTimeInSecs = addTrackDurationToTotal(curatedTracklistTotalTimeInSecs, track);
    console.log("Track duration is " + (track.duration || 0));
  }

  curatedTracklistTotalTimeInMins = Math.floor(curatedTracklistTotalTimeInSecs / 60);

  return curatedTracklistTotalTimeInSecs;
}

//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//  XXXXX HELPER FUNCTIONS (FOR CHECKING TRACK VALIDITY) XXXXXX
//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

function isTrackValidForGeneralRules(track, prevTrack1, prevTrack2, curatedTracklist, index, generalRuleFunctions) {
  return generalRuleFunctions.every((rule) => rule(track, prevTrack1, prevTrack2, curatedTracklist, index));
}

function addNextValidTrack(track, curatedTracklist, tracks) {
  curatedTracklist.push(track);
  const trackIndex = tracks.findIndex((t) => t === track);
  if (trackIndex !== -1) {
    tracks.splice(trackIndex, 1);
  }
}

function trackExistsWithAttributes(curatedTracklist, attribute, value) {
  for (const track of curatedTracklist) {
    if (typeof track === "object" && track.hasOwnProperty(attribute)) {
      // Check if track[attribute] is an array
      if (Array.isArray(track[attribute])) {
        // Check if any element in track[attribute] matches any element in value
        if (track[attribute].some((item) => value.includes(item))) {
          return track; // Return the first matching track
        }
      } else if (track[attribute] === value) {
        return track; // Return the first matching track
      }
    }
  }
  return null; // Return null if no matching track is found
}

function logRuleApplication(ruleNumber, trackName, logMessage, isApplied, ruleType) {
  const ruleStatus = isApplied ? "passed" : "failed"; // Use "failed" for consistency
  const statusIcon = isApplied ? "🌱" : "🫧"; // Add status icon based on isApplied
  console.log(`${statusIcon} R${ruleNumber} ${ruleStatus} ${trackName} ${logMessage} `); //findme
}

// Helper function to manage prevTrack1 and prevTrack2
function updatePrevTracks(track, prevTrack1, prevTrack2) {
  if (prevTrack1 === null) {
    prevTrack1 = track;
  } else if (prevTrack2 === null) {
    prevTrack2 = prevTrack1;
    prevTrack1 = track;
  } else {
    prevTrack2 = prevTrack1;
    prevTrack1 = track;
  }
  return [prevTrack1, prevTrack2];
}

//  ///////////////////////////////////////////////////
//  //////////  A LONG AND COMPLICATED FUNCTION ///////
//  //////////  THAT MAKES A CURATED TRACKLIST ////////
//  //////////  BY FOLLOWING THE RULES  ///////////////
//  ///////////////////////////////////////////////////

// ~~~ Initialization Functions ~~~
function initializecuratedTracklist() {
  return [];
}

function initializeGeneralRules() {
  return [r10, r11, r12, r13, r14, r15, r16];
}

function initializeEnsureRules(rules, fixedRules = []) {
  // Separate the rules that should not be shuffled
  const rulesToShuffle = rules.filter((rule) => !fixedRules.includes(rule));
  const shuffledEnsureRules = shuffleArrayOfRules(rulesToShuffle).concat(fixedRules);

  const ensureRulesEnforced = {};
  shuffledEnsureRules.forEach((rule) => {
    ensureRulesEnforced[`r${parseInt(rule.name.match(/\d+/)[0])}`] = false;
  });

  return { shuffledEnsureRules, ensureRulesEnforced };
}

function ensureGeneralRules(generalRuleFunctions, track, prevTrack1, prevTrack2, curatedTracklist, currIndex) {
  for (const generalRule of generalRuleFunctions) {
    // Handle null values for prevTrack1 and prevTrack2
    let safePrevTrack1 = prevTrack1 || {}; // Use an empty object if prevTrack1 is null
    let safePrevTrack2 = prevTrack2 || {}; // Use an empty object if prevTrack2 is null

    // Now pass the safePrevTrack1 and safePrevTrack2 to the rule function
    if (!generalRule(track, safePrevTrack1, safePrevTrack2, curatedTracklist, currIndex)) {
      // console.log(`🫧 General rule failed for ${track.name} by rule ${generalRule.name}`);
      return false; // General rule failed
    }
  }
  return true; // All general rules passed
}

// ~~~ Utility Functions ~~~
function applySpecificRule(ruleFunction, track, prevTrack1, prevTrack2, curatedTracklist, trackIndex) {
  return ruleFunction(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex);
}

function applyGeneralRules(generalRuleFunctions, track, prevTrack1, prevTrack2, curatedTracklist, trackIndex) {
  return isTrackValidForGeneralRules(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex, generalRuleFunctions);
}

// function applyGeneralRules(generalRuleFunctions, track, prevTrack1, prevTrack2, curatedTracklist, trackIndex) {
//   for (const generalRule of generalRuleFunctions) {
//     let ruleNumber = generalRule.name.match(/\d+/)[0]; // Extract the rule number from the function name
//     let ruleDescriptionVarName = `r${ruleNumber}rule`; // Construct the variable name for the rule description
//     let ruleDescription = eval(ruleDescriptionVarName); // Get the rule description using eval

//     if (!generalRule(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex)) {
//       console.log(`🫧 General rule failed for ${track.name} by rule ${generalRule.name}: ${ruleDescription}`);
//       return false; // General rule failed
//     } else {
//       // console.log(`🎉 Rule ${ruleNumber} Passed for Curated Track ${trackIndex + 1} (${track.name}): ${ruleDescription}`);
//     }
//   }
//   return true; // All general rules passed
// }

function ensureTrack(track, currIndex, ensureRules, ensureRulesEnforced, curatedTracklist) {
  for (const rule of ensureRules) {
    const ruleNumber = parseInt(rule.name.match(/\d+/)[0]);

    if (!isEnsureRuleEnforced(ensureRulesEnforced, ruleNumber)) {
      if (!rule(track, null, null, curatedTracklist, currIndex)) {
        return false; // Ensure rule failed, exit the loop
      }
      // Mark the rule as enforced once it passes
      markEnsureRuleEnforced(ensureRulesEnforced, ruleNumber);
    }
  }
  return true; // All ensure rules passed
}

function checkAllEnsureRulesEnforced(ensureRulesEnforced) {
  return Object.values(ensureRulesEnforced).every((flag) => flag === true);
}

function isEnsureRuleEnforced(ensureRulesEnforced, ruleNumber) {
  return ensureRulesEnforced[`r${ruleNumber}`];
}

function markEnsureRuleEnforced(ensureRulesEnforced, ruleNumber) {
  ensureRulesEnforced[`r${ruleNumber}`] = true;
}

function preFilterLastTracks(tracklist, curatedTracklist, generalRuleFunctions) {
  let potentialLastTracks = [];
  for (let track of tracklist) {
    if (track.placement.includes("end")) {
      let simulatedPrevTrack1 = curatedTracklist[curatedTracklist.length - 1] || {};
      let simulatedPrevTrack2 = curatedTracklist.length > 1 ? curatedTracklist[curatedTracklist.length - 2] : {};

      if (ensureGeneralRules(generalRuleFunctions, track, simulatedPrevTrack1, simulatedPrevTrack2, curatedTracklist, curatedTracklist.length)) {
        potentialLastTracks.push(track);
      }
    }
  }
  return potentialLastTracks;
}

function finalizeTracklist(tracklist, curatedTracklist, generalRuleFunctions) {
  if (curatedTracklist.length > 0) {
    let possibleLastTracks = preFilterLastTracks(tracklist, curatedTracklist, generalRuleFunctions);

    let lastTrack = findSuitableLastTrack(possibleLastTracks, curatedTracklist, generalRuleFunctions);

    if (lastTrack) {
      curatedTracklist.push(lastTrack);
    } else {
      console.log("No suitable last track found that meets the general rules and is not already in the list.");
    }
  }
  return curatedTracklist;
}

function findSuitableLastTrack(possibleLastTracks, curatedTracklist, generalRuleFunctions) {
  for (let track of possibleLastTracks) {
    if (
      !trackAlreadyInList(track, curatedTracklist) &&
      ensureGeneralRules(
        generalRuleFunctions,
        track,
        curatedTracklist[curatedTracklist.length - 1],
        curatedTracklist[curatedTracklist.length - 2],
        curatedTracklist,
        curatedTracklist.length
      )
    ) {
      return track;
    }
  }
  return null;
}

function trackAlreadyInList(track, curatedTracklist) {
  return curatedTracklist.some((curatedTrack) => curatedTrack.name === track.name);
}

// ~~~ Phase Functions ~~~
function executePhase1(tracklist, curatedTracklist, generalRuleFunctions) {
  console.log("🚀🚀🚀🚀🚀🚀🚀 Starting Phase 1: Apply specific rules and general rules");

  const specificRuleFunctions = [r61, r62, r63, r64, r65, r66, r67, r68];
  let ruleFailureCounts = specificRuleFunctions.map(() => 0); // Initialize failure counts for each rule
  let prevTrack1 = null;
  let prevTrack2 = null;
  let trackIndex = 0;

  for (let i = 0; i < specificRuleFunctions.length; i++) {
    let ruleMet = false;
    let tracksTried = 0; // Counter for the number of tracks tried
    let specificRuleDescription = eval(`r${61 + i}rule`); // Assumes rule descriptions are like r60rule, r61rule, etc.

    while (!ruleMet && tracksTried < tracklist.length) {
      let track = tracklist[tracksTried];

      if (applySpecificRule(specificRuleFunctions[i], track, prevTrack1, prevTrack2, curatedTracklist, trackIndex + 1)) {
        if (i < 2 || isTrackValidForGeneralRules(track, prevTrack1, prevTrack2, curatedTracklist, trackIndex, generalRuleFunctions)) {
          addNextValidTrack(track, curatedTracklist, tracklist);
          curatedTracklistTotalTimeInSecs = calculateOrUpdatecuratedTracklistDuration(track, curatedTracklist);
          [prevTrack1, prevTrack2] = updatePrevTracks(track, prevTrack1, prevTrack2);
          console.log(`${curatedTracklist.length}:✅ Added ${track.name} to the curated tracklist`);
          trackIndex++;
          ruleMet = true;
        } else {
          // console.log(`🫧 General Rules Failed for ${track.name}`);
          tracksTried++;
        }
      } else {
        // console.log(`🫧 Specific Rule Failed for ${track.name}: ${specificRuleDescription}`);
        ruleFailureCounts[i]++; // Increment failure count for the specific rule
        tracksTried++;
      }
    }

    if (!ruleMet) {
      const mostFrequentRuleIndex = ruleFailureCounts.indexOf(Math.max(...ruleFailureCounts));
      const mostFrequentRuleDescription = eval(`r${61 + mostFrequentRuleIndex}rule`);
      console.log(`OHHHHH NOOOOOO No suitable track found for specific rule: ${specificRuleDescription}.`);
      console.log(`Total tracks tried: ${tracksTried}. Most frequently broken rule: ${mostFrequentRuleDescription}`);
    }
  }
}

function executePhase2(tracklist, curatedTracklist, generalRuleFunctions, shuffledEnsureRules, ensureRulesEnforced) {
  console.log("🚀🚀🚀🚀🚀🚀🚀 Starting Phase 2: Ensure rules and final check rules");

  let prevTrack1 = curatedTracklist.length > 0 ? curatedTracklist[curatedTracklist.length - 1] : null;
  let prevTrack2 = curatedTracklist.length > 1 ? curatedTracklist[curatedTracklist.length - 2] : null;

  for (let rule of shuffledEnsureRules) {
    let ruleNumber = rule.name.replace("r", "");
    let ruleDescVarName = `r${ruleNumber}rule`;
    let ruleDescription = eval(ruleDescVarName);
    let ruleMet = false;

    console.log(`🔍 Checking if "${ruleDescription}" is already met in curatedTracklist.`);
    // Check if the rule is satisfied by any track in the curatedTracklist
    for (let track of curatedTracklist) {
      if (rule(track, null, null, curatedTracklist, curatedTracklist.indexOf(track))) {
        // console.log(`💯 ${ruleDescription} is already met by ${track.name} in curatedTracklist.`);
        markEnsureRuleEnforced(ensureRulesEnforced, ruleNumber); // Mark the rule as enforced
        ruleMet = true;
        break; // Rule is satisfied, no need to check further
      }
    }

    // If rule not met in curatedTracklist, find a track in tracklist to satisfy the rule
    if (!ruleMet) {
      console.log(`🔍 "${ruleDescription}" wasn't met, gotta go fishing!`);
      for (let track of tracklist) {
        console.log(`🔍 Checking if "${track.name}" meets "${ruleDescription}"`);
        if (rule(track, null, null, curatedTracklist, curatedTracklist.length)) {
          if (isTrackValidForGeneralRules(track, prevTrack1, prevTrack2, curatedTracklist, curatedTracklist.length, generalRuleFunctions)) {
            if (curatedTracklistTotalTimeInSecs + (track.duration || 0) > MAX_PLAYLIST_DURATION_SECONDS) {
              console.log(
                `NICE! OUT OF TIME while trying to add a track that meets ensure rules! curatedTracklistTotalTimeInSecs is ${curatedTracklistTotalTimeInSecs} and MAX_PLAYLIST_DURATION_SECONDS is ${MAX_PLAYLIST_DURATION_SECONDS}`
              );
              break; // Stop processing if the maximum duration is exceeded
            }

            addNextValidTrack(track, curatedTracklist, tracklist);
            curatedTracklistTotalTimeInSecs = calculateOrUpdatecuratedTracklistDuration(track, curatedTracklist);
            [prevTrack1, prevTrack2] = updatePrevTracks(track, prevTrack1, prevTrack2);
            console.log(`✅ Added "${track.name}" to curatedTracklist to meet "${ruleDescription}"`);
            markEnsureRuleEnforced(ensureRulesEnforced, ruleNumber); // Mark the rule as enforced
            ruleMet = true;
            break; // Suitable track found, stop searching
          } else {
            // console.log(`🫧 "${track.name}" meets "${ruleDescription}" but does not satisfy general rules.`);
          }
        }
      }
    }

    if (!ruleMet) {
      console.log(`Oh nooooooooooo ❌ Could not find a suitable track to satisfy the rule: ${ruleDescription}`);
      // Handle the situation where no track can satisfy the rule
    }
  }

  // Check the 'geese' tag rule
  if (geeseTrackCounter === 1) {
    const geeseTracks = tracklist.filter((track) => track.tags.includes("geese"));
    let geeseTrackAdded = false;

    for (const geeseTrack of geeseTracks) {
      console.log(`🔍 Checking if 'geese' track: ${geeseTrack.name} meets general rules.`);
      if (
        // true
        isTrackValidForGeneralRules(geeseTrack, prevTrack1, prevTrack2, curatedTracklist, curatedTracklist.length, generalRuleFunctions)
      ) {
        if (curatedTracklistTotalTimeInSecs + (geeseTrack.duration || 0) > MAX_PLAYLIST_DURATION_SECONDS) {
          console.log(
            `NICE! OUT OF TIME while trying to add a goose track that meets ensure rules! curatedTracklistTotalTimeInSecs is ${curatedTracklistTotalTimeInSecs} and MAX_PLAYLIST_DURATION_SECONDS is ${MAX_PLAYLIST_DURATION_SECONDS}`
          );
          break; // Stop processing if the maximum duration is exceeded
        }

        addNextValidTrack(geeseTrack, curatedTracklist, tracklist);
        curatedTracklistTotalTimeInSecs = calculateOrUpdatecuratedTracklistDuration(geeseTrack, curatedTracklist);
        geeseTrackCounter++;
        geeseTrackAdded = true;
        break; // Stop the loop as we have added a valid geese track
      } else {
        console.log(`🚫 'geese' track: ${geeseTrack.name} does not meet general rules.`);
      }
    }

    if (!geeseTrackAdded) {
      console.log(`🚫 Could not find an additional 'geese' track that meets general rules.`);
    }
  }
}

function executePhase3(tracklist, curatedTracklist, generalRuleFunctions, gooseRule) {
  console.log("🚀🚀🚀🚀🚀🚀🚀 Starting Phase 3: Main general rules loop");

  // Get the last two tracks added to the curated list for rule comparisons
  let prevTrack1 = curatedTracklist.length > 0 ? curatedTracklist[curatedTracklist.length - 1] : null;
  let prevTrack2 = curatedTracklist.length > 1 ? curatedTracklist[curatedTracklist.length - 2] : null;

  // Iterate through each track in the provided tracklist
  for (const track of tracklist) {
    // Check if adding the current track exceeds the maximum playlist duration

    if (curatedTracklistTotalTimeInSecs + (track.duration || 0) > MAX_PLAYLIST_DURATION_SECONDS) {
      console.log(
        `NICE! OUT OF TIME in phase 3! curatedTracklistTotalTimeInSecs is ${curatedTracklistTotalTimeInSecs} and MAX_PLAYLIST_DURATION_SECONDS is ${MAX_PLAYLIST_DURATION_SECONDS}`
      );
      break; // Stop processing if the maximum duration is exceeded
    }

    // Apply general rules to the track
    if (isTrackValidForGeneralRules(track, prevTrack1, prevTrack2, curatedTracklist, curatedTracklist.length, generalRuleFunctions)) {
      // Add the track to the curated list if it passes all checks
      addNextValidTrack(track, curatedTracklist, tracklist);
      curatedTracklistTotalTimeInSecs = calculateOrUpdatecuratedTracklistDuration(track, curatedTracklist);
      [prevTrack1, prevTrack2] = updatePrevTracks(track, prevTrack1, prevTrack2);
    } else {
      // console.log(`🫧 General Rules Failed for ${track.name}`);
    }

    // Check the 'geese' tag rule
    if (geeseTrackCounter === 1) {
      const geeseTracks = tracklist.filter((track) => track.tags.includes("geese"));
      let geeseTrackAdded = false;

      for (const geeseTrack of geeseTracks) {
        console.log(`🔍 Checking if 'geese' track: ${geeseTrack.name} meets general rules.`);

        if (
          // true
          isTrackValidForGeneralRules(track, prevTrack1, prevTrack2, curatedTracklist, curatedTracklist.length, generalRuleFunctions)
        ) {
          addNextValidTrack(geeseTrack, curatedTracklist, tracklist);
          curatedTracklistTotalTimeInSecs = calculateOrUpdatecuratedTracklistDuration(track, curatedTracklist);
          [prevTrack1, prevTrack2] = updatePrevTracks(track, prevTrack1, prevTrack2);
          geeseTrackCounter++;
          console.log(`✅ Additional 'geese' track added: ${geeseTrack.name}`);
          geeseTrackAdded = true;
          break; // Stop the loop as we have added a valid geese track
        } else {
          console.log(`🚫 'geese' track: ${geeseTrack.name} does not meet general rules.`);
        }
      }

      if (!geeseTrackAdded) {
        console.log(`🚫 Couldn't find an additional 'geese' track that meets general rules.`);
      }
    }
  }

  // Log the completion of Phase 3 with the final duration
  console.log(
    `✅ Phase 3 completed with curated tracklist duration: ${curatedTracklistTotalTimeInSecs} seconds and MAX_PLAYLIST_DURATION_SECONDS is ${MAX_PLAYLIST_DURATION_SECONDS}`
  );
}

function followTracklistRules(tracklist) {
  console.log("🚀 Starting to follow tracklist rules");
  let curatedTracklist = initializecuratedTracklist();
  const generalRuleFunctions = initializeGeneralRules();

  const { shuffledEnsureRules, ensureRulesEnforced } = initializeEnsureRules([r21, r22, r23, r24, r25], [r25]);

  executePhase1(tracklist, curatedTracklist, generalRuleFunctions);
  executePhase2(tracklist, curatedTracklist, generalRuleFunctions, shuffledEnsureRules, ensureRulesEnforced);
  executePhase3(tracklist, curatedTracklist, generalRuleFunctions);

  let curatedTracklistTotalTimeInSecs = getFinalcuratedTracklistDuration(curatedTracklist);
  console.log("curatedTracklistTotalTimeInSecs is " + curatedTracklistTotalTimeInSecs);

  if (curatedTracklistTotalTimeInSecs > MAX_PLAYLIST_DURATION_SECONDS) {
    console.log("⏰ Ran out of time before completing the tracklist curation!");
  } else {
    console.log("✅ Finished curating the tracklist");
  }

  return finalizeTracklist(tracklist, curatedTracklist, generalRuleFunctions);
}

//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//  XXXXX BEFORE THE RULES, WE SHUFFLE OUR TRACKLIST XXXXXX
//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

function shuffleTracklist(tracklist) {
  // Skip the first track (intro) and shuffle the rest of the tracks
  for (let i = tracklist.length - 1; i > 1; i--) {
    const j = Math.floor(Math.random() * (i - 1)) + 1; // Ensure j is at least 1
    [tracklist[i], tracklist[j]] = [tracklist[j], tracklist[i]];
  }
  return tracklist;
}

function shuffleArrayOfRules(shuffledRulesArray) {
  const lastElement = shuffledRulesArray.pop(); // Remove the last element
  for (let i = shuffledRulesArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledRulesArray[i], shuffledRulesArray[j]] = [shuffledRulesArray[j], shuffledRulesArray[i]]; // Swap elements at i and j
  }
  shuffledRulesArray.push(lastElement); // Add the last element back to the end
  return shuffledRulesArray; // Return the shuffled array
}

//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//  XXXXX CHECK THOSE TRACKS!!!! XXXXXX
//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

async function isValidTracklist(tracklist) {
  const invalidTracks = [];

  for (let i = 0; i < tracklist.length; i++) {
    const track = tracklist[i];

    // Check track URL
    if (!(await isValidUrl(track.url))) {
      invalidTracks.push({ type: "Track", url: track.url });
    }

    // Check credit URL
    if (track.credit && !(await isValidUrl(track.credit))) {
      invalidTracks.push({ type: "Credit", url: track.credit });
    }
  }

  if (invalidTracks.length > 0) {
    console.log("Invalid URLs:");
    console.log(invalidTracks);
  } else {
    // console.log("All URLs are valid.");
  }

  // Return true if there are no invalid tracks
  return invalidTracks.length === 0;
}

async function isValidUrl(url) {
  try {
    const response = await fetch(url);
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//  XXXXX CREATE AND PRINT DEBUG TEXT SO LAURA CAN SEE DETAILS XXXXXX
//  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

function displayDebugText(element, text, defaultText) {
  if (element) {
    if (text && text !== "") {
      element.textContent = " " + text;
    } else {
      element.textContent = defaultText;
    }
  } else {
    console.log("no element"); // TODO - why is there no element sometimes?
  }
}

function gatherAndPrintDebugInfo(song, index) {
  if (song) {
    // get debug ids so I can fill in debug info
    const currTrackNameHTMLElement = document.getElementById("currTrackName");
    // const playerTrackNameHTMLElement =
    document.getElementById("playerTrackName");

    const currURLHTMLElement = document.getElementById("currURL");
    const currTagsHTMLElement = document.getElementById("currTags");
    const currDurrHTMLElement = document.getElementById("currDurr");
    const totalDurrHTMLElement = document.getElementById("totalDurr");
    // const displayConsoleLogHTMLElement = document.getElementById("displayConsoleLog");
    const currCreditHTMLElement = document.getElementById("currCredit");
    const currIndexNokHTMLElement = document.getElementById("indexNo");
    // const currCreditStackHTMLElement = document.getElementById("creditStackHTML");
    // const currTotalIndexHTMLElement = document.getElementById("totalIndex");

    // get the info for THIS song so I can print it to the debug
    const currTags = song.tags;
    const currUrl = song.url;
    const currDurr = song.duration;
    const totalDurr = Math.floor(curatedTracklistTotalTimeInSecs / 60);
    const currName = song.name;
    // const bgMusic = song.backgroundMusic;

    const currCredit = song.credit;
    const ohcurrIndex = index;
    // creditstack defined elsewhere

    displayDebugText(currTrackNameHTMLElement, currName, "no name");
    // displayDebugText(playerTrackNameHTMLElement, currName, "no name");
    displayDebugText(currURLHTMLElement, currUrl, "no url");
    displayDebugText(currTagsHTMLElement, currTags, "no tags");
    // displayDebugText(currTagsHTMLElement, bgMusic, "no bgmusic");
    displayDebugText(currDurrHTMLElement, currDurr, "no duration");
    displayDebugText(totalDurrHTMLElement, totalDurr, "no duration");

    // displayDebugText(displayConsoleLogHTMLElement, displayConsoleLog, "no log");
    displayDebugText(currCreditHTMLElement, currCredit, "no credit");
    // displayDebugText(currCreditStackHTMLElement, creditsArray, "no credit");
    displayDebugText(currIndexNokHTMLElement, ohcurrIndex, "no index");
  } else {
    console.log("OH NO, NO SONG!");
    return;
  }
}

function printEntireTracklistDebug(shuffledSongsWithOpen) {
  const currTrackNameElement = document.getElementById("fullList");

  // Clear existing content
  currTrackNameElement.innerHTML = "";

  // Loop through shuffled songs and add each track with formatted details
  shuffledSongsWithOpen.forEach((song, index) => {
    const trackDiv = document.createElement("div");
    // Make Track number bold and a different color
    let trackDetails = `<strong style="color: orange; font-style: bold;">Track ${index + 1}:</strong> <br/>`;

    Object.keys(song).forEach((key) => {
      // Skip unwanted keys
      if (["engTrans", "frTrans", "url", "credit", "audio"].includes(key)) return;

      const value = Array.isArray(song[key]) ? song[key].join(", ") : song[key];
      // Keys in teal and bold, values in normal text
      trackDetails += `<strong style="color: teal;">${key}:</strong> ${value || "none"} <br/>`;
    });

    trackDiv.innerHTML = trackDetails;
    currTrackNameElement.appendChild(trackDiv);
  });

  // Show or log a message if no tracks are available
  currTrackNameElement.style.display = shuffledSongsWithOpen.length > 0 ? "block" : "none";
  if (shuffledSongsWithOpen.length === 0) {
    console.log("No items to display.");
  }
}

// first time is queueNextTrack(curatedTracklist, 0, 0, cache));
function queueNextTrack(songs, index, currentRuntime, cache) {
  try {
    const song = songs[index]; // get the song object
    const audio = song.audio;
    player = audio; // Update player to the current audio

    // Log current song information
    console.log(`Queueing song: ${song.name}, Index: ${index}, Current Runtime: ${currentRuntime}`);
    // currentRuntime = randomValueSomeTimerThing;

    // Tell the browser to start downloading audio
    if (audio) {
      audio.preload = "auto";
    }

    const track = audioContext.createMediaElementSource(audio);
    track.connect(volumeNode);

    // When the song has ended, queue up the next one
    audio.addEventListener("ended", (e) => {
      const duration = audio.duration;
      // console.log(`Song ended: ${song.name}, Duration: ${duration}`);
      timerDuration += Math.floor(duration); // Update currentRuntime with the cumulative duration
      // Queue up the next song (songs, index, currentRuntime, cache) {
      console.log("Queueing next track with the following values:");
      console.log(`Queueing- Index: ${index + 1}`);
      console.log(`Queueing- Current Runtime: ${currentRuntime}`);
      // console.log(`Queueing- Current duration: ${duration}`);
      // console.log(`Queueing- Current Runtime + duration: ${currentRuntime + duration}`);
      // console.log(`Queueing- Cache: ${cache}`);
      queueNextTrack(songs, index + 1, currentRuntime, cache);
    });

    // Set a timer to preload the next file
    const timeoutDurationMs = (song.duration - PREFETCH_BUFFER_SECONDS) * 1000;
    setTimeout(() => {
      const nextAudio = songs[index + 1];
      nextAudio.preload = "auto";
      fetchAndCacheAudio(nextAudio.url, cache).then((p) => console.log(`Loaded ${nextAudio.url} into cache`));
    }, timeoutDurationMs);

    // Log the debug information
    gatherAndPrintDebugInfo(song, index);

    // Play the audio
    audio.play();

    // Update the progress timer for the first time
    // createTimerLoopAndUpdateProgressTimer();
  } catch (error) {
    // Log any errors that occur
    console.error("An error occurred in queueNextTrack:", error);
  }
}

function checkPlaylistRules(playlist) {
  let prevTrack = null;
  const authorCounts = {};
  let hasAlbert = false;
  let hasPierreElliott = false;
  let hasInterview = false;
  let hasMusic = false;
  let geeseTracksCount = 0;

  for (let i = 0; i < playlist.length; i++) {
    const track = playlist[i];

    // Update flags when conditions are met
    if (track.author === "ALBERT") {
      hasAlbert = true;
    }
    if (track.author === "PIERREELLIOTT") {
      hasPierreElliott = true;
    }
    if (track.form === "interview") {
      hasInterview = true;
    }
    if (track.form === "music") {
      hasMusic = true;
    }
    if (track.tags && track.tags.includes("geese")) {
      geeseTracksCount++;
    }

    // Increment the count for the author
    authorCounts[track.author] = (authorCounts[track.author] || 0) + 1;

    // CHECK R61: The 0th track must have the tag 'intro'
    if (i === 0 && !track.tags.includes("intro")) {
      console.log(`❌❌❌ R61 violated at Track 1 (${track.name}) does not have the tag 'intro'. ${r61rule}`);
    }

    // CHECK R62: The 1st track must have the placement 'beginning'
    if (i === 1 && !track.placement.includes("beginning")) {
      console.log(`❌❌❌ R62 violated at Track 2 (${track.name}) does not have placement 'beginning'. ${r62rule}`);
    }

    // CHECK R63: The 2nd track must have placement 'beginning' and a different form than the 1st track
    if (i === 2 && (!track.placement.includes("beginning") || track.form === playlist[i - 1].form)) {
      console.log(`❌❌❌ R63 violated at Track 3 (${track.name}) does not meet the criteria of ${r63rule}`);
    }

    // CHECK R64: The 3rd track must have the placement 'middle' and a different form than the 2nd track
    if (i === 3 && (!track.placement.includes("middle") || track.form === playlist[i - 1].form)) {
      console.log(`❌❌❌ R64 violated at Track 4 (${track.name}) does not meet the criteria of ${r64rule}`);
    }

    // CHECK R65: The 4th track must have the length 'short', the placement 'middle', and a different form than the 3rd track
    if (i === 4) {
      let ruleViolations = [];

      if (track.length !== "short") {
        ruleViolations.push("Track length is not 'short': " + track.length);
      }

      if (!track.placement.includes("middle")) {
        ruleViolations.push("Track placement is not 'middle': " + track.placement);
      }

      if (track.form === playlist[i - 1].form) {
        ruleViolations.push(`Track form is the same as the 3rd track (${track.form})`);
      }

      if (ruleViolations.length > 0) {
        console.log(`❌❌❌ R65 violated at Track 5 (${track.name}). Reasons: ${ruleViolations.join(", ")}. Rule description: ${r65rule}`);
      }
    }

    // CHECK R66: The 5th track must have placement 'middle' and a different form than the 4th track
    if (i === 5) {
      let ruleViolationsR66 = [];

      if (!track.placement.includes("middle")) {
        ruleViolationsR66.push("Track placement is not 'middle'");
      }

      if (track.form === playlist[i - 1].form) {
        ruleViolationsR66.push(`Track form is the same as the 4th track (${track.form})`);
      }

      if (ruleViolationsR66.length > 0) {
        console.log(`❌❌❌ R66 violated at Track 6 (${track.name}). Reasons: ${ruleViolationsR66.join(", ")}. Rule description: ${r66rule}`);
      }
    }

    // CHECK R67: The 6th track must have placement 'middle' and a different form than the 5th track
    if (i === 6) {
      let ruleViolationsR67 = [];

      if (!track.placement.includes("middle")) {
        ruleViolationsR67.push("Track placement is not 'middle'");
      }

      if (track.form === playlist[i - 1].form) {
        ruleViolationsR67.push(`Track form is the same as the 5th track (${track.form})`);
      }

      if (ruleViolationsR67.length > 0) {
        console.log(`❌❌❌ R67 violated at Track 7 (${track.name}). Reasons: ${ruleViolationsR67.join(", ")}. Rule description: ${r67rule}`);
      }
    }

    // CHECK R68: The 7th track must have placement 'middle' and a different form than the 6th track
    if (i === 7 && (!track.placement.includes("middle") || track.form === playlist[i - 1].form)) {
      console.log(`❌❌❌ R68 violated at Track 8 (${track.name}) does not meet the criteria of ${r68rule}`);
    }

    // Apply general rules only if the track index is less than 4 or after the specific rules phase.
    if (i < 4 || i >= 8) {
      // CHECK R10: The current track must have a different author than the last track
      if (prevTrack && track.author === prevTrack.author) {
        console.log(`❌❌❌ R10 violated at Curated Track ${i + 1} (${track.name}): Same author as the previous track. ${r10rule}`);
      }

      // CHECK R11: No more than two tracks from the same author in a tracklist
      if (authorCounts[track.author] > 2) {
        console.log(`❌❌❌ R11 violated at Curated Track ${i + 1} (${track.name}): More than two tracks from the same author. ${r11rule}`);
      }

      // CHECK R12: Tracks with the form short and the language musical can never follow tracks with the form music.
      if (track.form === "short" && track.language === "musical" && prevTrack && prevTrack.form === "music") {
        console.log(`❌❌❌ R12 violated! (${track.name}): short (musical) followed by music, does not meet the criteria of ${r12rule}`);
      }

      // CHECK R13: Tracks with the form music can never follow tracks with both the form short and the language musical.
      if (track.form === "music" && prevTrack && prevTrack.form === "short" && prevTrack.language === "musical") {
        console.log(`❌❌❌ R13 violated! (${track.name}): Music followed by short (musical), does not meet the criteria of ${r13rule}`);
      }

      // CHECK R14: The value for backgroundMusic should never match the author of the track right before it, and the author of the track should never match the backgroundMusic of the track right before it.
      if (prevTrack && (track.backgroundMusic === prevTrack.author || track.author === prevTrack.backgroundMusic)) {
        console.log(
          `❌❌❌ R14 violated! Current Track: '${track.name}' - Author: '${track.author}', Background Music: '${track.backgroundMusic}'. ` +
            `Previous Track: '${prevTrack.name}' - Author: '${prevTrack.author}', Background Music: '${prevTrack.backgroundMusic}'. ` +
            `Violation: ${
              track.backgroundMusic === prevTrack.author
                ? "Current track's background music matches previous track's author."
                : "Current track's author matches previous track's background music."
            }`
        );
      }

      // CHECK R15: If the previous track has the sentiment heavy, this track cannot have the the laughter tag.
      if (prevTrack && prevTrack.tags.includes("laughter") && track.tags.includes("heavy")) {
        console.log(`❌❌❌ R15 violated! (${track.name}): Laughter followed by heavy sentiment. does not meet the criteria of ${r15rule}`);
      }

      // CHECK R16: If the previous track has length long and form music, this track must have the form interview or poetry`;
      if (prevTrack && prevTrack.length === "long" && prevTrack.form === "music") {
        if (track.form !== "interview" && track.form !== "poetry") {
          console.log(`❌❌❌ R16 violated! (${track.name}): Long music track not followed by an interview or poetry.`);
        }
      }
    }

    // CHECK R00: Last track must have the placement 'end'
    if (i === playlist.length - 1 && !track.placement.includes("end")) {
      console.log(`❌❌❌ R00 violated! (${track.name}): Last track does not have placement 'end', does not meet the criteria of ${r00rule}`);
    }

    prevTrack = track; // Set the current track as the previous track for the next iteration
  }

  // Check for c21, c22, c23, c24, c25 after iterating through the playlist
  if (!hasAlbert) {
    console.log("❌❌❌ Rule c21 violated: Playlist does not contain a track with the author ALBERT. does not meet the criteria");
  }
  if (!hasPierreElliott) {
    console.log("❌❌❌ Rule c22 violated: Playlist does not contain a track with the author PIERREELLIOTT. does not meet the criteria");
  }
  if (!hasInterview) {
    console.log("❌❌❌ Rule c23 violated: Playlist does not contain a track with the form interview. does not meet the criteria");
  }
  if (!hasMusic) {
    console.log("❌❌❌ Rule c24 violated: Playlist does not contain a track with the form music. does not meet the criteria");
  }
  // Check for geese after iterating through the playlist
  if (geeseTracksCount === 1) {
    console.log("❌❌❌ Rule c25 violated: Playlist contains exactly one track with the tag geese, which is not allowed.");
  } else if (geeseTracksCount === 0 || geeseTracksCount > 1) {
    console.log(`🎉 Acceptable number of 'geese' tracks found: ${geeseTracksCount}.`);
  }
}

let firstPlay = true;
var playButtonTextContainer = document.getElementById("play-button-text-container");




const playingSVG = `<img id="play-icon" class="svg-icon" src="images/icons/playButton.svg" alt="Play Icon">`;
const pausedSVG = `<img id="play-icon" class="svg-icon" src="images/icons/pauseButton.svg" alt="Pause Icon">`;

// Text Constants
const playingText = "PLAY";
const pausedText = "STOP";

function toggleButtonVisuals(isPlaying) {
  playButtonTextContainer.style.left = isPlaying ? "50%" : "35%";
  svgContainer.innerHTML = isPlaying ? pausedSVG : playingSVG;
  textContainer.textContent = isPlaying ? "STOP" : "PLAY";
  playButton.classList.toggle("playing", isPlaying);
  playButton.classList.toggle("paused", !isPlaying);
}

function prepareAudioContext() {
  if (audioContext == null) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
    volumeNode = audioContext.createGain();
    volumeNode.connect(audioContext.destination);
  }
}

function prepareAndQueueTracks() {
  const allSongs = [...songs];
  const shuffledSongs = shuffleTracklist(allSongs);
  curatedTracklist = followTracklistRules(shuffledSongs);
  checkPlaylistRules(curatedTracklist);

  addOutrosAndCreditsToTracklist();
  createTranscriptContainer();
  printEntireTracklistDebug(curatedTracklist);

  window.caches.open("audio-pre-cache").then((cache) => queueNextTrack(curatedTracklist, 0, 0, cache));
  createTimerLoopAndUpdateProgressTimer();
}

function addOutrosAndCreditsToTracklist() {
  curatedTracklist.push(...outroAudioSounds.map(addAudioFromUrl));
  curatedTracklist.push(...gatherTheCreditSongs(curatedTracklist));
  curatedTracklist.push(...finalOutroAudioSounds.map(addAudioFromUrl));
}

function handlePlayPauseClick() {
  if (firstPlay) {

    requestWakeLock();

    toggleButtonVisuals(true); // Assume playing state on first play
    generatePlayer();
    prepareAudioContext();
    prepareAndQueueTracks();
    player.play();
    playerPlayState = "play";
    audioContext.resume();
    isValidTracklist(curatedTracklist);


    firstPlay = false; // Set firstPlay to false after handling the first play
  } else {
    // Handle subsequent toggles between play and pause
    if (playButton.classList.contains("playing")) {
      console.log("Pausing");
      toggleButtonVisuals(false); // Update visuals to reflect pause state
      player.pause();
      playerPlayState = "pause";
      audioContext.suspend();
    } else {
      console.log("Playing");
      toggleButtonVisuals(true); // Update visuals to reflect play state
      player.play();
      playerPlayState = "play";
      audioContext.resume();
    }
  }
}

