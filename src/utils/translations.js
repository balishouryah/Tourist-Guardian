export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'mr', name: 'मराठी' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'gu', name: 'ગુજરાતી' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'kn', name: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'മലയാളം' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ' },
  { code: 'as', name: 'অসমীয়া' },
  { code: 'or', name: 'ଓଡ଼ିଆ' }
];

export const translations = {
  en: {
    // Navigation & Common
    home: "Home",
    map: "Map",
    nearby: "Nearby",
    settings: "Settings",
    emergency: "Emergency",
    cancel: "Cancel",
    refresh: "Refresh",
    call: "Call",
    
    // Dashboard
    safety_status: "Safety Status",
    safety_score: "Safety Score",
    live_location: "Live Location",
    nearby_services: "Nearby Services",
    emergency_contacts: "Emergency Contacts",
    offline_status: "Offline Status",
    view_offline_maps: "View Offline Maps",
    alerts: "Alerts",
    
    // SOS Screen
    sos_title: "SOS ACTIVATED",
    emergency_active: "EMERGENCY ACTIVE",
    sos_sent: "Your SOS has been sent.",
    location_shared: "Your live location has been shared with authorities.",
    waiting_ack: "Waiting for acknowledgement...",
    report_ack: "REPORT ACKNOWLEDGED",
    report_seen: "Your emergency report has been seen by the authorities.",
    stay_calm: "Stay calm. Your location is being monitored.",
    help_on_way: "HELP IS ON THE WAY",
    authorities_responding: "Authorities have acknowledged your emergency and are responding.",
    location_available: "Your live location remains available to the response team.",
    emergency_resolved: "EMERGENCY RESOLVED",
    incident_resolved: "This incident has been resolved.",
    call_police: "CALL EMERGENCY SERVICES",
    nearest_police: "VIEW NEAREST POLICE STATIONS",
    view_location: "VIEW LIVE LOCATION",
    false_alarm: "Cancel (False Alarm)",
    return_dashboard: "Return to Dashboard",
    
    // Nearby Services
    hospitals: "Hospitals",
    police_stations: "Nearest Police Stations",
    pharmacies: "Pharmacies",
    food: "Food",
    groceries: "Groceries",
    hotels: "Hotels",
    distance: "km away",
    directions: "Navigate",
    your_location: "Live Location",
    results: "Results",
    
    // Safety Questionnaire & Score
    questionnaire_title: "Safety Questionnaire",
    immediate_danger: "Are you currently in immediate danger?",
    threatened: "Has anyone threatened or followed you?",
    unsafe: "Do you feel unsafe right now?",
    lost: "Are you lost or unsure of your location?",
    no_transport: "Do you lack access to transportation?",
    low_battery: "Is your phone battery critically low?",
    alone: "Are you traveling alone?",
    submit_assessment: "Submit Assessment",
    yes: "YES",
    no: "NO",
    critical: "CRITICAL",
    high: "HIGH",
    caution: "CAUTION",
    safe: "SAFE",
    contact_police: "Contact Police",
    retake_assessment: "Retake Assessment",
    
    // Offline
    offline_mode: "OFFLINE MODE",
    internet_unavailable: "Internet unavailable",
    offline_maps: "Offline Maps",
    available_offline: "AVAILABLE OFFLINE",
    download_map: "Download Map",
    open_map: "OPEN MAP",
    pending_sos: "SOS QUEUED",
    gps_status: "GPS Status",
    last_sync: "Last Sync",
    
    // Safety ID
    digital_safety_id: "Digital Safety ID",
    nationality: "Nationality",
    destination: "Destination",
    status: "Status",
    verified: "Verified",
    not_provided: "Not provided"
  },
  
  hi: {
    // Navigation & Common
    home: "होम",
    map: "नक्शा",
    nearby: "आस-पास",
    settings: "सेटिंग्स",
    emergency: "आपातकालीन",
    cancel: "रद्द करें",
    refresh: "रिफ्रेश",
    call: "कॉल करें",
    
    // Dashboard
    safety_status: "सुरक्षा स्थिति",
    safety_score: "सुरक्षा स्कोर",
    live_location: "लाइव लोकेशन",
    nearby_services: "आस-पास की सेवाएँ",
    emergency_contacts: "आपातकालीन संपर्क",
    offline_status: "ऑफ़लाइन स्थिति",
    view_offline_maps: "ऑफ़लाइन मानचित्र देखें",
    alerts: "अलर्ट",
    
    // SOS Screen
    sos_title: "SOS सक्रिय",
    emergency_active: "आपातकाल सक्रिय",
    sos_sent: "आपका SOS भेज दिया गया है।",
    location_shared: "आपकी लाइव लोकेशन अधिकारियों के साथ साझा की गई है।",
    waiting_ack: "प्रतिक्रिया की प्रतीक्षा में...",
    report_ack: "रिपोर्ट स्वीकृत",
    report_seen: "आपकी आपातकालीन रिपोर्ट अधिकारियों द्वारा देख ली गई है।",
    stay_calm: "शांत रहें। आपकी लोकेशन की निगरानी की जा रही है।",
    help_on_way: "मदद रास्ते में है",
    authorities_responding: "अधिकारियों ने आपकी आपात स्थिति को स्वीकार कर लिया है और प्रतिक्रिया दे रहे हैं।",
    location_available: "आपकी लाइव लोकेशन बचाव दल के लिए उपलब्ध है।",
    emergency_resolved: "आपातकाल समाप्त",
    incident_resolved: "यह घटना हल कर दी गई है।",
    call_police: "आपातकालीन सेवाओं को कॉल करें",
    nearest_police: "निकटतम पुलिस स्टेशन देखें",
    view_location: "लाइव लोकेशन देखें",
    false_alarm: "रद्द करें (झूठी सूचना)",
    return_dashboard: "डैशबोर्ड पर लौटें",
    
    // Nearby Services
    hospitals: "अस्पताल",
    police_stations: "निकटतम पुलिस स्टेशन",
    pharmacies: "फार्मेसियां",
    food: "भोजन",
    groceries: "किराना",
    hotels: "होटल",
    distance: "किमी दूर",
    directions: "दिशा निर्देश",
    your_location: "आपकी लोकेशन",
    results: "परिणाम",
    
    // Safety Questionnaire & Score
    questionnaire_title: "सुरक्षा प्रश्नावली",
    immediate_danger: "क्या आप अभी तत्काल खतरे में हैं?",
    threatened: "क्या किसी ने आपको धमकी दी है या आपका पीछा किया है?",
    unsafe: "क्या आप अभी असुरक्षित महसूस कर रहे हैं?",
    lost: "क्या आप खो गए हैं या अपनी लोकेशन के बारे में अनिश्चित हैं?",
    no_transport: "क्या आपके पास परिवहन तक पहुंच का अभाव है?",
    low_battery: "क्या आपके फोन की बैटरी बहुत कम है?",
    alone: "क्या आप अकेले यात्रा कर रहे हैं?",
    submit_assessment: "मूल्यांकन जमा करें",
    yes: "हाँ",
    no: "नहीं",
    critical: "अत्यधिक गंभीर (CRITICAL)",
    high: "गंभीर (HIGH)",
    caution: "सावधान (CAUTION)",
    safe: "सुरक्षित (SAFE)",
    contact_police: "पुलिस से संपर्क करें",
    retake_assessment: "पुनर्मूल्यांकन करें",
    
    // Offline
    offline_mode: "ऑफ़लाइन मोड",
    internet_unavailable: "इंटरनेट उपलब्ध नहीं है",
    offline_maps: "ऑफ़लाइन मानचित्र",
    available_offline: "ऑफ़लाइन उपलब्ध",
    download_map: "मानचित्र डाउनलोड करें",
    open_map: "मानचित्र खोलें",
    pending_sos: "SOS कतार में",
    gps_status: "GPS स्थिति",
    last_sync: "अंतिम सिंक",
    
    // Safety ID
    digital_safety_id: "डिजिटल सेफ्टी आईडी",
    nationality: "राष्ट्रीयता",
    destination: "गंतव्य",
    status: "स्थिति",
    verified: "सत्यापित",
    not_provided: "प्रदान नहीं किया गया"
  },
  
  // Scaffolding for remaining languages to allow structural support
  mr: {}, bn: {}, gu: {}, ta: {}, te: {}, kn: {}, ml: {}, pa: {}, as: {}, or: {}
};
