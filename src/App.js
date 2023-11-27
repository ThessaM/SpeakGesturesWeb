import './App.css';
import React, { useEffect, useRef, useState } from "react";
import {
  GestureRecognizer,
  FilesetResolver,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

import model from './Assets/gesture_recognizer.task';


function App() {
  const videoHeight = "360px";
  const videoWidth = "480px";
  const canvasRef = useRef(null);
  const [webCamRunning, setWebCamRunning] = useState(false);
  const [gestureOutputVisible, setGestureOutputVisible] = useState(false);
  const [gestureOutputText, setGestureOutputText] = useState("");
  const gestureRecognizerRef = useRef(null);
  const videoRef = useRef(null);
  var runningMode = "IMAGE";

  useEffect(() => {
    const canvasCtx = canvasRef.current.getContext("2d");
    createGestureRecognizer(canvasCtx);
  }, []);

  async function createGestureRecognizer(canvasCtx) {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );

    gestureRecognizerRef.current = await GestureRecognizer.createFromOptions(
      vision,
      {
        baseOptions: {
          modelAssetPath: model,
          delegate: "AUTO"
        },
        runningMode: "IMAGE",
        numHands: 2
      }
    );
  }

  function enableCam() {
    if (!gestureRecognizerRef.current) {
      alert("Gesture Recognizer is still loading");
      return;
    }

    const webCamButton = document.getElementById("enableWebcamButton");
    if (webCamRunning === true) {
      setWebCamRunning(false);
      webCamButton.innerText = "DISABLE PREDICTIONS";
    } else {
      setWebCamRunning(true);
      webCamButton.innerText = "ENABLE PREDICTIONS";
    }

    const constraints = { video: true };

    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener("loadeddata", predictWebcam);
    });
  }

  let lastVideoTime = -1;
  let results = undefined;

  async function predictWebcam() {
    const webcamElement = videoRef.current;

    if (runningMode === "IMAGE") {
      gestureRecognizerRef.current.setOptions({ runningMode: "VIDEO" });
    }

    let nowInMs = Date.now();
    if (webcamElement.currentTime !== lastVideoTime) {
      lastVideoTime = webcamElement.currentTime;
      results = gestureRecognizerRef.current.recognizeForVideo(
        webcamElement,
        nowInMs
      );
    }

    const canvasCtx = canvasRef.current.getContext("2d");
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    const drawingUtils = new DrawingUtils(canvasCtx);

    canvasRef.current.style.height = videoHeight;
    webcamElement.style.height = videoHeight;
    canvasRef.current.style.width = videoWidth;
    webcamElement.style.width = videoWidth;

    if(results.landmarks){
      for(let landmarks of results.landmarks){
        // drawingUtils.drawConnectors(
        //   landmarks,
        //   GestureRecognizer.HAND_CONNECTIONS,
        //   {
        //     color: "#00FF00",
        //     lineWidth: 5
        //   }
        // );
        drawingUtils.drawLandmarks(landmarks,{
            color: "#E6E1D5",
            lineWidth: 1,
            radius: 4
        });
      }
    }

    canvasCtx.restore();

    if (results.gestures.length > 0 && results.gestures[0][0].score > 0.65) {
      const gestureName = results.gestures[0][0].categoryName;
      const gestureScore = parseFloat(
        results.gestures[0][0].score * 100
      ).toFixed(2);
      const handedness = results.handednesses[0][0].displayName;
  
      setGestureOutputVisible(true);
      // setGestureOutputText(
      //   `GestureRecognizer: ${gestureName} ${'\n'} Confidence: ${gestureScore}% ${'\n'} Handedness: ${handedness}`
      // );
      addResultsOutput(gestureName);
      
    } else {
      // setGestureOutputVisible(false);
    }

    if (webCamRunning === true) {
      window.requestAnimationFrame(predictWebcam);
    }
  }


  function addResultsOutput(newResult){
    setGestureOutputText(`${gestureOutputText} ${newResult}`);
  }

  return (
    <div>
      <h1>SpeakGestures Web</h1>
      <div>
        <button id="enableWebcamButton" onClick={enableCam}>
          <span>Enable Webcam</span>
        </button>
        <div style={{ display:"block", position: "relative"}}>
          <video id="webcam" autoPlay playsInline ref={videoRef}></video>
          <canvas
            className="output_canvas"
            id="output_canvas"
            width={videoWidth}
            height={videoHeight}
            ref={canvasRef}
            style={{ position: "absolute", top: 0, left: 0, zIndex: 1}}
          ></canvas>
          <p id="gesture_output" style={{ display: gestureOutputVisible ? "block" : "none" }} >{gestureOutputText}</p>
        </div>
      </div>
    </div>
  );
}

export default App;

/*

GestureRecognizerResult:
  Handedness:
    Categories #0:
      index        : 0
      score        : 0.98396
      categoryName : Left
  Gestures:
    Categories #0:
      score        : 0.76893
      categoryName : Thumb_Up
  Landmarks:
    Landmark #0:
      x            : 0.638852
      y            : 0.671197
      z            : -3.41E-7
    Landmark #1:
      x            : 0.634599
      y            : 0.536441
      z            : -0.06984
    ... (21 landmarks for a hand)
  WorldLandmarks:
    Landmark #0:
      x            : 0.067485
      y            : 0.031084
      z            : 0.055223
    Landmark #1:
      x            : 0.063209
      y            : -0.00382
      z            : 0.020920
    ... (21 world landmarks for a hand)

*/