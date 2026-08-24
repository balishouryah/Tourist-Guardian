const fs = require('fs');
const file = 'src/utils/useSafetyEngine.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "const lastScore = useRef(null);",
  "const lastScore = useRef(null);\n  const lastSeverity = useRef(null);\n  const lastSignals = useRef(null);"
);

content = content.replace(
  "if (lastScore.current === null || Math.abs(lastScore.current - newRisk.score) >= 10 || newRisk.severity === 'CRITICAL') {",
  `const signalsChanged = JSON.stringify(lastSignals.current) !== JSON.stringify(newRisk.signals);
    const severityChanged = lastSeverity.current !== newRisk.severity;
    
    // Push to DB if score changes significantly, severity changes, signals change, or initialization
    if (lastScore.current === null || Math.abs(lastScore.current - newRisk.score) >= 10 || severityChanged || signalsChanged) {`
);

content = content.replace(
  "lastScore.current = newRisk.score;",
  "lastScore.current = newRisk.score;\n      lastSeverity.current = newRisk.severity;\n      lastSignals.current = newRisk.signals;"
);

content = content.replace(
  "lastScore.current = 100;",
  "lastScore.current = 100;\n    lastSeverity.current = 'SAFE';\n    lastSignals.current = [];"
);

fs.writeFileSync(file, content);
