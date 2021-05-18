import firebase from "firebase/app";
import "firebase/analytics";
import * as uuid from "uuid";

const firebaseConfig = {
  apiKey: "AIzaSyCHOlOOw9cOxF2eYmafVspVaG0t5RBnE9I",
  authDomain: "crispr-crunch.firebaseapp.com",
  projectId: "crispr-crunch",
  storageBucket: "crispr-crunch.appspot.com",
  messagingSenderId: "315283364159",
  appId: "1:315283364159:web:e6f4f0aa4742890506db8a",
  measurementId: "G-SYR8CJNSTP",
};

type ConnectionType = "web" | "android" | "ios";

let didInit = false;
let connectionType: ConnectionType;

// Only set in case of web interface:
let analytics: firebase.analytics.Analytics;
let userId: string;

export function init(): void {
  if (didInit) return;

  connectionType = determineConnectionType();
  console.log("metrics determined connection type", connectionType);

  // Initialize Firebase and set user id
  establishUserId();
  if (connectionType === "web") {
    firebase.initializeApp(firebaseConfig);
    analytics = firebase.analytics();
    analytics.setUserId(userId);
  } else if (connectionType === "android") {
    (window as any).AnalyticsWebInterface.setUserId(userId);
  } else if (connectionType === "ios") {
    // Call iOS interface
    const message = {
      command: "setUserId",
      id: userId,
    };
    (window as any).webkit.messageHandlers.firebase.postMessage(message);
  }

  didInit = true;
}

export function logEvent(name: string, data?: { [k: string]: any }) {
  init();

  console.log("logEvent", name, data);

  if (connectionType === "web") {
    analytics.logEvent(name, data);
  } else if (connectionType === "android") {
    (window as any).AnalyticsWebInterface.logEvent(name, JSON.stringify(data));
  } else if (connectionType === "ios") {
    const message = {
      command: "logEvent",
      name: name,
      parameters: data,
    };
    (window as any).webkit.messageHandlers.firebase.postMessage(message);
  }
}

function determineConnectionType(): ConnectionType {
  const w: any = window;
  if (w.AnalyticsWebInterface) {
    return "android";
  } else if (
    w.webkit &&
    w.webkit.messageHandlers &&
    w.webkit.messageHandlers.firebase
  ) {
    return "ios";
  } else {
    return "web";
  }
}

function establishUserId() {
  if (localStorage.getItem("userId")) {
    userId = localStorage.getItem("userId");
    console.log("Found userId", userId);
  } else {
    userId = uuid.v4();
    localStorage.setItem("userId", userId);
    console.log("Creating new userId", userId);
  }
}
