import firebase from "firebase/app";
import "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCHOlOOw9cOxF2eYmafVspVaG0t5RBnE9I",
  authDomain: "crispr-crunch.firebaseapp.com",
  projectId: "crispr-crunch",
  storageBucket: "crispr-crunch.appspot.com",
  messagingSenderId: "315283364159",
  appId: "1:315283364159:web:e6f4f0aa4742890506db8a",
  measurementId: "G-SYR8CJNSTP",
};

let analytics: firebase.analytics.Analytics;
let didInit = false;

export function init(): void {
  if (didInit) return;

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  analytics = firebase.analytics();

  didInit = true;
}

export function logEvent(name: string, data?: { [k: string]: any }) {
  init();

  analytics.logEvent(name, data);
  console.log("logEvent", name, data);
}
