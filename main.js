const video = document.querySelector("#camera");
const statusText = document.querySelector("#status");
const objectName = document.querySelector("#resultname");
const confidence = document.querySelector("#resultaccuracy");
let classifier;
let previousLabel = "";
let stopped = false;

function stop(message) {
  stopped = true;
  statusText.textContent = message;
  objectName.textContent = confidence.textContent = "—";
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }
}

function classifyFrame() {
  if (stopped) return;
  classifier.classify(video, (error, results) => {
    if (stopped) return;
    if (error) {
      stop("Image recognition failed. Reload the page to try again.");
      return;
    }

    const prediction = results && results[0];
    if (prediction && prediction.confidence > 0.5) {
      objectName.textContent = prediction.label;
      confidence.textContent = (prediction.confidence * 100).toFixed(1) + "%";
      if (prediction.label !== previousLabel && window.speechSynthesis && window.SpeechSynthesisUtterance) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance("Object detected is " + prediction.label));
      }
      previousLabel = prediction.label;
    } else {
      objectName.textContent = "Unsure";
      confidence.textContent = "—";
      previousLabel = "";
    }
    setTimeout(classifyFrame, 200);
  });
}

async function start() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    stop("Open this page on localhost or HTTPS in a browser with camera support.");
    return;
  }
  if (!window.ml5) {
    stop("The recognition library could not load. Check your connection and reload.");
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = stream;
    stream.getVideoTracks()[0].addEventListener("ended", () => stop("Camera disconnected. Reconnect it and reload."));
    await video.play();
  } catch (error) {
    stop(error.name === "NotAllowedError"
      ? "Camera access was denied. Allow camera access and reload."
      : "Could not start the camera. Check that it is connected and available, then reload.");
    return;
  }

  if (stopped) return;
  statusText.textContent = "Loading MobileNet…";
  try {
    classifier = ml5.imageClassifier("MobileNet");
    await classifier.ready;
    if (stopped) return;
    statusText.textContent = "";
    classifyFrame();
  } catch (error) {
    stop("MobileNet could not start. Check your connection and reload.");
  }
}

start();
