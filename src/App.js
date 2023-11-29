import './App.css';
import React, { useEffect, useRef, useState } from "react";
import {
  GestureRecognizer,
  FilesetResolver,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";



import model from './Assets/gesture_recognizer.task';
import logoSG from './Assets/SpeakGesturesLogo.png';



function App(){
  return (
    <div className=''>
      <WebNavBar></WebNavBar>
      <BisindoRecognition></BisindoRecognition>
      <WebFooter></WebFooter>
    </div>
  );
}


function BisindoRecognition() {
  const videoHeight = "360px";
  const videoWidth = "480px";
  const canvasRef = useRef(null);
  const [webCamRunning, setWebCamRunning] = useState(false);
  const [gestureOutputVisible, setGestureOutputVisible] = useState(false);
  const [gestureOutputText, setGestureOutputText] = useState("");
  const [timeoutId, setTimeoutId] = useState(null);
  const [videoVisible, setVideoVisible] = useState(false);
  const gestureRecognizerRef = useRef(null);
  const videoRef = useRef(null);
  const [resultArr, setResultArr] = useState([]);
  var runningMode = "IMAGE";

  useEffect(() => {
    const canvasCtx = canvasRef.current.getContext("2d");
    createGestureRecognizer(canvasCtx);
  }, []);

  useEffect(() => {
    handleGestureResult();
  }, [resultArr]);

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
      webCamButton.style.display = "none";
    } else {
      setWebCamRunning(true);
      webCamButton.innerText = "ENABLE PREDICTIONS";
    }

    setVideoVisible(true);

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
      // const gestureScore = parseFloat(
      //   results.gestures[0][0].score * 100
      // ).toFixed(2);
      // const handedness = results.handednesses[0][0].displayName;
  
      setGestureOutputVisible(true);

      // setGestureOutputText(
      //   `GestureRecognizer: ${gestureName} ${'\n'} Confidence: ${gestureScore}% ${'\n'} Handedness: ${handedness}`
      // );

      addToResultArr(gestureName);
 
    } 

    if (webCamRunning) {
      window.requestAnimationFrame(predictWebcam);
    }

  }

  function addToResultArr(newItem){
    setResultArr((prevResultArr) => [...prevResultArr, newItem]);
  };

  function handleGestureResult() {
    if (resultArr.length > 8) {
      let lastResults = resultArr.slice(-8);
      if (lastResults.every((res) => res === lastResults[0])) {
        // If all results are the same
        setGestureOutputText((prevResult) => `${prevResult} ${lastResults[0]}`);
        setGestureOutputVisible(true); // Set visibility to true

        // Reset timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        const newTimeoutId = setTimeout(() => {
          setGestureOutputVisible(false);
          setGestureOutputText("");
          setResultArr([]); 
        }, 8000);

        setTimeoutId(newTimeoutId);
        setResultArr([]);
        
      }
    }
  };

  


  return (
    <div className="App-body">
      
      <div className='d-flex flex-column align-items-center'>
        
        <div style={{ position: "relative", maxWidth: `${videoWidth}`}} 
          id='gesture-display' 
          className={videoVisible ? "visible" : "hidden"}
        >
          
          <video 
            id="webcam" 
            autoPlay 
            playsInline 
            ref={videoRef} 
            className='rounded-4'
          ></video>
          
          <canvas
            className="output_canvas"
            width={videoWidth}
            height={videoHeight}
            ref={canvasRef}
            style={{ position: "absolute", top: 0, left: 0, zIndex: 1}}
          ></canvas>

          <p 
            style={{ display: gestureOutputVisible ? "block " : "none"}} 
            className='text-dark'>{gestureOutputText}
          </p>
        </div>

        <button id="enableWebcamButton" 
          onClick={enableCam} 
          type="button" 
          className="btn btn-info text-light"
        >
          <span>Enable Webcam</span>
        </button>
      </div>
    </div>
  );
}



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


function WebNavBar(){

  const handleNavItemClick = () => {
    alert(`Page Coming Soon`);
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-2">
      <div className="container-fluid">
        <a className="navbar-brand" href="#">
          <img
            alt="SpeakGesturesLogo"
            src= {logoSG}
            width="50"
            height="50"
            className="d-inline-block align-middle"
          />{' '}
          <span className="text-primary">Speak</span>
          <span className="text-light">Gestures</span>
        </a>
        <button
          className="navbar-toggler"
          type="button"
          data-toggle="collapse"
          data-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ml-auto ">
            <li className="nav-item">
              <a className="nav-link" href="#">
                <b>Home</b>
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#" onClick={handleNavItemClick}>
                <b>Dictionary</b>
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#" onClick={handleNavItemClick}>
                <b>About Us</b>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

function WebFooter(){
  return (
    <footer className="footer mt-auto py-3" style={{ backgroundColor: '#333333'}}>
      <div className="container text-center">
        <span className="text-light">SpeakGestures &copy; {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}


export default App;