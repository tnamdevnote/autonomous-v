// Drives the host's simulation clock. Timers in a worker keep running when the
// facilitator's tab is in the background, unlike requestAnimationFrame or page timers.
setInterval(() => postMessage(0), 33);
