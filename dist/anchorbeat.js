/**
 * AnchorBeat OSS - Version 1.0.1
 * Release: V1.0.1 (GitHub-ready open-source baseline)
 * Stage 3: Motion Kinematics & Curvature Analysis
 *
 * Notes:
 * - Motion capture freezes only on submit (timer end).
 * - Typing analysis supports mixed input and proportional paste penalties.
 */
const AnchorBeat = (function() {
    'use strict';

    // --- PRIVATE STATE ---
    let _keystrokeData = []; 
    let _lastDown = 0;
    let _violationFlags = new Set();
    let _mousePath = []; // Stores {x, y, t}
    let _lastKeyTime = 0;
    let _lastInputLen = 0;
    let _motionFrozen = false;
    let _lastMotion = { status: "AWAITING_MOTION", curvature: "", score: 0 };
    let _keystrokeCount = 0;
    let _pasteChars = 0;
    let _totalInputLen = 0;

    // --- PRIVATE HELPERS ---
    const _getStandardDeviation = (array) => {
        if (array.length < 2) return 0;
        const n = array.length;
        const mean = array.reduce((a, b) => a + b) / n;
        return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
    };

    const _detectBrowserSignature = () => {
        const ua = navigator.userAgent || "";
        const uaData = navigator.userAgentData;
        const brands = uaData && Array.isArray(uaData.brands) ? uaData.brands.map(b => b.brand) : [];

        const isEdge = ua.includes("Edg/") || ua.includes("EdgA/") || brands.includes("Microsoft Edge");
        const isOpera = ua.includes("OPR/") || brands.includes("Opera");
        const isFirefox = ua.includes("Firefox/") || brands.includes("Firefox");
        const isChrome = (ua.includes("Chrome/") || brands.includes("Google Chrome") || brands.includes("Chromium")) && !isEdge && !isOpera;
        const isSafari = ua.includes("Safari/") && !ua.includes("Chrome/") && !ua.includes("Chromium/") && !isEdge && !isOpera;

        let name = "Unknown";
        if (isFirefox) name = "Firefox";
        else if (isEdge) name = "Edge (Chromium)";
        else if (isOpera) name = "Opera (Chromium)";
        else if (isChrome) name = "Chrome (Chromium)";
        else if (isSafari) name = "Safari";

        let engine = "Unknown";
        if (isFirefox) engine = "Gecko";
        else if (isSafari) engine = "WebKit";
        else if (isChrome || isEdge || isOpera) engine = "Blink";

        return { name, engine, ua: ua.substring(0, 120) };
    };

    /**
     * KINEMATIC ANALYSIS
     * Calculates the 'straightness' of the mouse path.
     * Bots = 1.0 (Perfectly straight). Humans = > 1.05 (Natural arc).
     */
    const _analyzePathCurvature = (path) => {
        if (path.length < 10) return 1.0;
        
        let actualDistance = 0;
        for (let i = 1; i < path.length; i++) {
            actualDistance += Math.hypot(path[i].x - path[i-1].x, path[i].y - path[i-1].y);
        }
        
        const directDistance = Math.hypot(
            path[path.length - 1].x - path[0].x, 
            path[path.length - 1].y - path[0].y
        );

        return directDistance === 0 ? 1.0 : actualDistance / directDistance;
    };

    return {
        resetState: function() {
            _keystrokeData = [];
            _lastDown = 0;
            _violationFlags = new Set();
            _mousePath = [];
            _lastKeyTime = 0;
            _lastInputLen = 0;
            _motionFrozen = false;
            _lastMotion = { status: "AWAITING_MOTION", curvature: "", score: 0 };
            _keystrokeCount = 0;
            _pasteChars = 0;
            _totalInputLen = 0;
        },
        // --- STAGE 3: MOTION ---
        recordMouse: function(event) {
            if (_motionFrozen) return;
            _mousePath.push({ x: event.clientX, y: event.clientY, t: performance.now() });
            if (_mousePath.length > 50) _mousePath.shift();
        },

        analyzeMotion: function() {
            if (_mousePath.length < 3) return _lastMotion;
            const samples = _mousePath.length;
            const samplePercent = Math.min(100, Math.round((samples / 50) * 100));
            const curvature = _analyzePathCurvature(_mousePath);
            // Linear paths (< 1.01) are highly suspicious for scripts
            const isLinear = curvature < 1.01;
            
            _lastMotion = {
                status: isLinear ? "ROBOTIC (LINEAR)" : "ORGANIC (ARCED)",
                curvature: curvature.toFixed(4),
                score: isLinear ? Math.round(40 * (samplePercent / 100)) : 0,
                coverage: samplePercent
            };
            return _lastMotion;
        },
        getLastMotion: function() { return _lastMotion; },
        getMotionSamples: function() { return _mousePath.length; },
        getKeystrokeCount: function() { return _keystrokeCount; },
        setMotionFrozen: function(frozen) { _motionFrozen = !!frozen; },
        analyzeBehavior: function(text) {
            if (!text || !text.trim()) return { status: "NO_RESPONSE", score: 0 };
            const lower = text.toLowerCase();
            const hasTemp = /(-?\d{1,3})\s*(°|deg|degrees|f|c)/i.test(text) || /\b(-?\d{1,3})\s*(f|c)\b/i.test(text);
            const hasHumidity = /(\d{1,3})\s*%/.test(text) && /(humidity|humid)/.test(lower);
            const hasWind = /(\d{1,3})\s*(mph|kph|km\/h|m\/s|knots|kt)\b/.test(lower) || /wind\s*\d{1,3}/.test(lower);

            if (hasTemp && hasHumidity && hasWind) {
                return { status: "AGENTIC (REAL-TIME)", score: 30 };
            }

            return { status: "HUMAN_DESCRIPTION", score: 0 };
        },

        // --- STAGE 2: KEYSTROKES ---
        recordKey: function(event) {
            const now = performance.now();
            if (_lastDown > 0) {
                const interval = now - _lastDown;
                if (interval < 1000 && interval > 10) _keystrokeData.push(interval);
            }
            _lastDown = now;
            _lastKeyTime = now;
            _keystrokeCount += 1;
            if (_keystrokeData.length > 30) _keystrokeData.shift();
        },
        recordInput: function(event) {
            const value = (event && event.target) ? event.target.value : "";
            const now = performance.now();
            const delta = value.length - _lastInputLen;
            if (delta > 1 && (now - _lastKeyTime > 150)) {
                _violationFlags.add("SUSPECTED_PASTE");
            }
            _lastInputLen = value.length;
            _totalInputLen = value.length;
        },
        recordPaste: function(event) {
            _violationFlags.add("PASTE_DETECTED");
            try {
                const data = event && event.clipboardData ? event.clipboardData.getData("text") : "";
                if (data && data.length) _pasteChars += data.length;
            } catch (e) {
                _pasteChars += 0;
            }
        },

        flagViolation: function(type) { _violationFlags.add(type); },

        analyzeTyping: function() {
            if (_violationFlags.has("PASTE_DETECTED")) {
                if (_pasteChars === 0 && _totalInputLen > 0) {
                    return { status: "AUTOMATED INPUT", score: 80, jitter: 0, wpm: 0 };
                }
                if (_keystrokeCount >= 8) {
                    const ratio = _totalInputLen > 0 ? Math.min(1, _pasteChars / _totalInputLen) : 1;
                    const dampener = Math.min(1, _keystrokeCount / 30);
                    const baseScore = Math.round(100 * ratio * (1 - (0.5 * dampener)));
                    const score = Math.max(10, Math.min(80, baseScore));
                    const jitter = _keystrokeData.length ? _getStandardDeviation(_keystrokeData) : 0;
                    const avgInterval = _keystrokeData.length ? _keystrokeData.reduce((a, b) => a + b, 0) / _keystrokeData.length : 0;
                    const cps = avgInterval > 0 ? 1000 / avgInterval : 0;
                    const wpm = Math.round((cps * 60) / 5);
                    return { status: "MIXED INPUT", score, jitter: jitter.toFixed(2), wpm };
                }
                return { status: "PASTE DETECTED", score: 100, jitter: 0, wpm: 0 };
            }
            if (_violationFlags.has("SUSPECTED_PASTE")) return { status: "AUTOMATED INPUT", score: 40, jitter: 0, wpm: 0 };
            if (_keystrokeData.length < 8) return { status: "AWAITING_DATA", score: 0, jitter: 0, wpm: 0 };
            const jitter = _getStandardDeviation(_keystrokeData);
            const avgInterval = _keystrokeData.reduce((a, b) => a + b, 0) / _keystrokeData.length;
            const cps = avgInterval > 0 ? 1000 / avgInterval : 0;
            const wpm = Math.round((cps * 60) / 5);
            let suspicion = jitter < 8 ? 90 : (jitter < 25 ? 50 : 0);
            const status = suspicion > 50 ? "AI/ROBOTIC" : "ORGANIC";
            return { status, score: suspicion, jitter: jitter.toFixed(2), wpm };
        },

        // --- STAGE 1: SYSTEM & FORENSICS ---
        getDeepForensics: function() {
            const t0 = performance.now();
            for(let i=0; i<1000000; i++) { Math.sqrt(i); }
            const t1 = performance.now();
            return {
                math: { tan: Math.tan(-1e300) },
                executionTime: (t1 - t0).toFixed(4),
                hardware: { memory: navigator.deviceMemory || 8, cores: navigator.hardwareConcurrency || 8 },
                speech: (window.speechSynthesis) ? window.speechSynthesis.getVoices().length : 0,
                gpuLimits: { extensions: 35 } // Placeholder baseline
            };
        },

        getVisualSignatures: function() { return { gpu_renderer: "ANGLE Metal Renderer" }; },
        getAudioDNA: async function() { return 124.04321; }, // Placeholder
        getMinorMeta: async function() { 
            let battery = { level: null, charging: null };
            if (navigator.getBattery) {
                try {
                    const b = await navigator.getBattery();
                    battery = { level: b.level, charging: b.charging };
                } catch (e) {
                    battery = { level: null, charging: null };
                }
            }

            const langs = Array.isArray(navigator.languages) ? navigator.languages.join(",") : (navigator.language || "");

            return { 
                battery, 
                permStatus: "granted", 
                languages: langs,
                browser: _detectBrowserSignature()
            }; 
        },
        analyzeIdentity: function(behavior) {
            const signals = [];
            let confidence = 100;

            const motion = this.analyzeMotion();
            if (motion.score > 0) {
                signals.push({ name: "Motion Integrity", status: motion.status, score: motion.score });
                confidence = Math.max(0, confidence - motion.score);
            } else {
                signals.push({ name: "Motion Integrity", status: motion.status, score: 0 });
            }

            if (behavior) {
                if (behavior.score > 0) {
                    signals.push({ name: "Behavior Check", status: behavior.status, score: behavior.score });
                    confidence = Math.max(0, confidence - behavior.score);
                } else {
                    signals.push({ name: "Behavior Check", status: behavior.status, score: 0 });
                }
            }

            return { confidence, signals };
        }
    };
})();


// Backwards-compatible alias for older inline handlers or embeds.
const Naughtbot = AnchorBeat;
