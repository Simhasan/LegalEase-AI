/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
// Fix: Import `Type` enum for responseSchema.
import { GoogleGenAI, Type } from '@google/genai';
import * as pdfjsLib from 'pdfjs-dist';
import { marked } from 'marked';
import mammoth from 'mammoth';

// Set worker source for pdf.js from a CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;

const INDIAN_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'te', name: 'Telugu' },
  { code: 'mr', name: 'Marathi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'kn', name: 'Kannada' },
  { code: 'pa', name: 'Punjabi' },
];

const translations = {
  en: {
    headerTitle: "LegalEase AI",
    headerSubtitle: "Demystifying Legal Documents",
    yourDocument: "Your Document",
    analysisLanguageLabel: "Analysis Language:",
    analyzedFile: "Selected File",
    textareaPlaceholder: "The contents of your uploaded file will appear here.",
    processingButton: "Processing...",
    uploadFileButton: "Upload File",
    analyzingButton: "Analyzing...",
    summarizeButton: "Summarize & Analyze",
    dismissError: "Dismiss error",
    loadingMessageDefault: "Analyzing...",
    loadingSummary: "Generating summary...",
    loadingRisks: "Analyzing for risks...",
    loadingELI15: "Simplifying text (ELI15)...",
    loadingExtractingText: "Extracting text from",
    loadingProcessingPDF: "Processing PDF",
    loadingExtractingPages: "Extracting text from document pages...",
    loadingFindingAnswer: "Finding an answer...",
    plainSummaryTab: "Plain Summary",
    eli15Tab: "Explain Like I'm 15",
    riskAnalysisTab: "Risk Analysis",
    askQuestionTab: "Ask a Question",
    readAloudButton: "▶ Read Aloud",
    stopButton: "■ Stop",
    copyButton: "Copy",
    copiedButton: "Copied!",
    suggestionLabel: "💡 Suggestion:",
    noRisksFound: "No significant risks were identified in the document.",
    qaPlaceholder: "Ask a question about the document.",
    qaInputPlaceholder: "e.g., What is the penalty for early termination?",
    sendButton: "Send",
    welcomeTitle: "Welcome to LegalEase AI",
    welcomeMessage1: "Upload a file to get started.",
    welcomeMessage2: "We'll provide a simple summary, highlight risks, and answer your questions in your chosen language.",
    footerDisclaimer: "Disclaimer: LegalEase AI provides informational summaries and is not a substitute for professional legal advice.",
    errorEmptyDocument: "Please upload a file to begin analysis.",
    errorAnalysis: "An error occurred during analysis. Please try again.",
    errorUnsupportedFile: "Unsupported file type. Please upload a .txt, .docx, .pdf, .jpg, .jpeg, .png, or .webp file.",
    errorNoTextExtracted: "Could not extract any text from the document.",
    errorFileProcessing: "Failed to process file.",
    errorSpeechSynthesis: "Sorry, text-to-speech is not supported by your browser or for the selected language.",
    errorQADefault: "Sorry, I encountered an error. Please try again.",
    pageOf: "page {currentPage} of {totalPages}",
  },
  hi: {
    headerTitle: "लीगल-ईज़ एआई",
    headerSubtitle: "कानूनी दस्तावेज़ों को सरल बनाना",
    yourDocument: "आपका दस्तावेज़",
    analysisLanguageLabel: "विश्लेषण भाषा:",
    analyzedFile: "चयनित फ़ाइल",
    textareaPlaceholder: "आपकी अपलोड की गई फ़ाइल की सामग्री यहाँ दिखाई देगी।",
    processingButton: "प्रोसेस हो रहा है...",
    uploadFileButton: "फ़ाइल अपलोड करें",
    analyzingButton: "विश्लेषण हो रहा है...",
    summarizeButton: "सारांश और विश्लेषण करें",
    dismissError: "त्रुटि खारिज करें",
    loadingMessageDefault: "विश्लेषण हो रहा है...",
    loadingSummary: "सारांश बना रहा है...",
    loadingRisks: "जोखिमों का विश्लेषण कर रहा है...",
    loadingELI15: "टेक्स्ट को सरल बना रहा है (ELI15)...",
    loadingExtractingText: "से टेक्स्ट निकाला जा रहा है",
    loadingProcessingPDF: "पीडीएफ़ प्रोसेस हो रहा है",
    loadingExtractingPages: "दस्तावेज़ के पन्नों से टेक्स्ट निकाला जा रहा है...",
    loadingFindingAnswer: "उत्तर खोज रहा है...",
    plainSummaryTab: "सरल सारांश",
    eli15Tab: "15 साल के बच्चे की तरह समझाओ",
    riskAnalysisTab: "जोखिम विश्लेषण",
    askQuestionTab: "प्रश्न पूछें",
    readAloudButton: "▶ पढ़कर सुनाओ",
    stopButton: "■ रोको",
    copyButton: "कॉपी",
    copiedButton: "कॉपी किया गया!",
    suggestionLabel: "💡 सुझाव:",
    noRisksFound: "दस्तावेज़ में कोई महत्वपूर्ण जोखिम नहीं मिला।",
    qaPlaceholder: "दस्तावेज़ के बारे में एक प्रश्न पूछें।",
    qaInputPlaceholder: "जैसे, जल्दी समाप्ति के लिए क्या जुर्माना है?",
    sendButton: "भेजें",
    welcomeTitle: "लीगल-ईज़ एआई में आपका स्वागत है",
    welcomeMessage1: "शुरू करने के लिए एक फ़ाइल अपलोड करें।",
    welcomeMessage2: "हम आपकी चुनी हुई भाषा में एक सरल सारांश प्रदान करेंगे, जोखिमों को उजागर करेंगे, और आपके प्रश्नों का उत्तर देंगे।",
    footerDisclaimer: "अस्वीकरण: लीगल-ईज़ एआई केवल सूचनात्मक सारांश प्रदान करता है और यह पेशेवर कानूनी सलाह का विकल्प नहीं है।",
    errorEmptyDocument: "विश्लेषण शुरू करने के लिए कृपया एक फ़ाइल अपलोड करें।",
    errorAnalysis: "विश्लेषण के दौरान एक त्रुटि हुई। कृपया पुन: प्रयास करें।",
    errorUnsupportedFile: "असमर्थित फ़ाइल प्रकार। कृपया .txt, .docx, .pdf, .jpg, .jpeg, .png, या .webp फ़ाइल अपलोड करें।",
    errorNoTextExtracted: "दस्तावेज़ से कोई टेक्स्ट नहीं निकाला जा सका।",
    errorFileProcessing: "फ़ाइल को प्रोसेस करने में विफल।",
    errorSpeechSynthesis: "क्षमा करें, टेक्स्ट-टू-स्पीच आपके ब्राउज़र द्वारा या चयनित भाषा के लिए समर्थित नहीं है।",
    errorQADefault: "क्षमा करें, मुझे एक त्रुटि का सामना करना पड़ा। कृपया पुन: प्रयास करें।",
    pageOf: "पृष्ठ {totalPages} का {currentPage}",
  },
  bn: {
    headerTitle: "লিগ্যালইজ এআই",
    headerSubtitle: "আইনি নথি সহজ করা",
    yourDocument: "আপনার নথি",
    analysisLanguageLabel: "বিশ্লেষণের ভাষা:",
    analyzedFile: "নির্বাচিত ফাইল",
    textareaPlaceholder: "আপনার আপলোড করা ফাইলের বিষয়বস্তু এখানে প্রদর্শিত হবে।",
    processingButton: "প্রসেস হচ্ছে...",
    uploadFileButton: "ফাইল আপলোড করুন",
    analyzingButton: "বিশ্লেষণ করা হচ্ছে...",
    summarizeButton: "সারসংক্ষেপ ও বিশ্লেষণ করুন",
    dismissError: "ত্রুটি খারিজ করুন",
    loadingMessageDefault: "বিশ্লেষণ করা হচ্ছে...",
    loadingSummary: "সারসংক্ষেপ তৈরি হচ্ছে...",
    loadingRisks: "ঝুঁকির জন্য বিশ্লেষণ করা হচ্ছে...",
    loadingELI15: "পাঠ্য সরল করা হচ্ছে (ELI15)...",
    loadingExtractingText: "থেকে পাঠ্য নিষ্কাশন করা হচ্ছে",
    loadingProcessingPDF: "পিডিএফ প্রসেস করা হচ্ছে",
    loadingExtractingPages: "নথির পৃষ্ঠা থেকে পাঠ্য নিষ্কাশন করা হচ্ছে...",
    loadingFindingAnswer: "উত্তর খোঁজা হচ্ছে...",
    plainSummaryTab: "সরল সারসংক্ষেপ",
    eli15Tab: "যেন আমি ১৫ বছরের",
    riskAnalysisTab: "ঝুঁকি বিশ্লেষণ",
    askQuestionTab: "প্রশ্ন জিজ্ঞাসা করুন",
    readAloudButton: "▶ জোরে পড়ুন",
    stopButton: "■ থামুন",
    copyButton: "কপি",
    copiedButton: "কপি হয়েছে!",
    suggestionLabel: "💡 পরামর্শ:",
    noRisksFound: "নথিতে কোনো উল্লেখযোগ্য ঝুঁকি পাওয়া যায়নি।",
    qaPlaceholder: "নথি সম্পর্কে একটি প্রশ্ন জিজ্ঞাসা করুন।",
    qaInputPlaceholder: "যেমন, তাড়াতাড়ি চুক্তিভঙ্গের জন্য জরিমানা কত?",
    sendButton: "প্রেরণ করুন",
    welcomeTitle: "লিগ্যালইজ এআই-তে স্বাগতম",
    welcomeMessage1: "শুরু করতে একটি ফাইল আপলোড করুন।",
    welcomeMessage2: "আমরা আপনার নির্বাচিত ভাষায় একটি সহজ সারসংক্ষেপ প্রদান করব, ঝুঁকিগুলি তুলে ধরব এবং আপনার প্রশ্নের উত্তর দেব।",
    footerDisclaimer: "দাবিত্যাগ: লিগ্যালইজ এআই তথ্যমূলক সারসংক্ষেপ প্রদান করে এবং এটি পেশাদার আইনি পরামর্শের বিকল্প নয়।",
    errorEmptyDocument: "বিশ্লেষণ শুরু করতে অনুগ্রহ করে একটি ফাইল আপলোড করুন।",
    errorAnalysis: "বিশ্লেষণের সময় একটি ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    errorUnsupportedFile: "অসমর্থিত ফাইলের ধরন। অনুগ্রহ করে একটি .txt, .docx, .pdf, .jpg, .jpeg, .png, বা .webp ফাইল আপলোড করুন।",
    errorNoTextExtracted: "নথি থেকে কোনো পাঠ্য নিষ্কাশন করা যায়নি।",
    errorFileProcessing: "ফাইল প্রসেস করতে ব্যর্থ হয়েছে।",
    errorSpeechSynthesis: "দুঃখিত, আপনার ব্রাউজার বা নির্বাচিত ভাষার জন্য টেক্সট-টু-স্পীচ সমর্থিত নয়।",
    errorQADefault: "দুঃখিত, একটি ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    pageOf: "পৃষ্ঠা {totalPages} এর {currentPage}",
  },
  te: {
    headerTitle: "లీగల్ఈజ్ ఏఐ",
    headerSubtitle: "చట్టపరమైన పత్రాలను సులభతరం చేయడం",
    yourDocument: "మీ పత్రం",
    analysisLanguageLabel: "విశ్లేషణ భాష:",
    analyzedFile: "ఎంచుకున్న ఫైల్",
    textareaPlaceholder: "మీరు అప్‌లోడ్ చేసిన ఫైల్ యొక్క విషయాలు ఇక్కడ కనిపిస్తాయి.",
    processingButton: "ప్రాసెస్ అవుతోంది...",
    uploadFileButton: "ఫైల్ అప్లోడ్ చేయండి",
    analyzingButton: "విశ్లేషిస్తోంది...",
    summarizeButton: "సారాంశం & విశ్లేషణ",
    dismissError: "లోపాన్ని తీసివేయండి",
    loadingMessageDefault: "విశ్లేషిస్తోంది...",
    loadingSummary: "సారాంశం సృష్టిస్తోంది...",
    loadingRisks: "ప్రమాదాల కోసం విశ్లేషిస్తోంది...",
    loadingELI15: "వచనాన్ని సులభతరం చేస్తోంది (ELI15)...",
    loadingExtractingText: "నుండి వచనాన్ని సంగ్రహిస్తోంది",
    loadingProcessingPDF: "PDF ప్రాసెస్ అవుతోంది",
    loadingExtractingPages: "పత్రం పేజీల నుండి వచనాన్ని సంగ్రహిస్తోంది...",
    loadingFindingAnswer: "సమాధానం కోసం వెతుకుతోంది...",
    plainSummaryTab: "సాధారణ సారాంశం",
    eli15Tab: "15 ఏళ్ల వారికి వివరించినట్లు",
    riskAnalysisTab: "ప్రమాద విశ్లేషణ",
    askQuestionTab: "ప్రశ్న అడగండి",
    readAloudButton: "▶ బిగ్గరగా చదవండి",
    stopButton: "■ ఆపండి",
    copyButton: "కాపీ",
    copiedButton: "కాపీ చేయబడింది!",
    suggestionLabel: "💡 సూచన:",
    noRisksFound: "పత్రంలో ముఖ్యమైన ప్రమాదాలు ఏవీ గుర్తించబడలేదు.",
    qaPlaceholder: "పత్రం గురించి ఒక ప్రశ్న అడగండి.",
    qaInputPlaceholder: "ఉదా., ముందుగా రద్దు చేసుకుంటే జరిమానా ఎంత?",
    sendButton: "పంపండి",
    welcomeTitle: "లీగల్ఈజ్ ఏఐకు స్వాగతం",
    welcomeMessage1: "ప్రారంభించడానికి ఒక ఫైల్‌ను అప్‌లోడ్ చేయండి.",
    welcomeMessage2: "మేము మీరు ఎంచుకున్న భాషలో ఒక సాధారణ సారాంశాన్ని అందిస్తాము, ప్రమాదాలను హైలైట్ చేస్తాము మరియు మీ ప్రశ్నలకు సమాధానమిస్తాము.",
    footerDisclaimer: "నిరాకరణ: లీగల్ఈజ్ ఏఐ సమాచార సారాంశాలను అందిస్తుంది మరియు ఇది వృత్తిపరమైన న్యాయ సలహాకు ప్రత్యామ్నాయం కాదు.",
    errorEmptyDocument: "విశ్లేషణ ప్రారంభించడానికి దయచేసి ఒక ఫైల్‌ను అప్‌లోడ్ చేయండి.",
    errorAnalysis: "విశ్లేషణ సమయంలో ఒక లోపం సంభవించింది। దయచేసి మళ్ళీ ప్రయత్నించండి.",
    errorUnsupportedFile: "మద్దతు లేని ఫైల్ రకం। దయచేసి .txt, .docx, .pdf, .jpg, .jpeg, .png, లేదా .webp ఫైల్ను అప్లోడ్ చేయండి.",
    errorNoTextExtracted: "పత్రం నుండి ఏ వచనాన్ని సంగ్రహించలేకపోయింది.",
    errorFileProcessing: "ఫైల్ను ప్రాసెస్ చేయడంలో విఫలమైంది.",
    errorSpeechSynthesis: "క్షమించండి, మీ బ్రౌజర్లో లేదా ఎంచుకున్న భాషకు టెక్స్ట్-టు-స్పీచ్ మద్దతు లేదు.",
    errorQADefault: "క్షమించండి, నేను ఒక లోపాన్ని ఎదుర్కొన్నాను। దయచేసి మళ్ళీ ప్రయత్నించండి.",
    pageOf: "{totalPages}లో {currentPage}వ పేజీ",
  },
  mr: {
    headerTitle: "लीगलईझ एआय",
    headerSubtitle: "कायदेशीर कागदपत्रे सोपी करणे",
    yourDocument: "तुमचे दस्तऐवज",
    analysisLanguageLabel: "विश्लेषण भाषा:",
    analyzedFile: "निवडलेली फाइल",
    textareaPlaceholder: "तुमच्या अपलोड केलेल्या फाइलमधील मजकूर येथे दिसेल.",
    processingButton: "प्रक्रिया होत आहे...",
    uploadFileButton: "फाईल अपलोड करा",
    analyzingButton: "विश्लेषण होत आहे...",
    summarizeButton: "सारांश आणि विश्लेषण करा",
    dismissError: "त्रुटी काढा",
    loadingMessageDefault: "विश्लेषण होत आहे...",
    loadingSummary: "सारांश तयार करत आहे...",
    loadingRisks: "धोक्यांसाठी विश्लेषण करत आहे...",
    loadingELI15: "मजकूर सोपा करत आहे (ELI15)...",
    loadingExtractingText: "मधून मजकूर काढत आहे",
    loadingProcessingPDF: "पीडीएफ प्रक्रिया होत आहे",
    loadingExtractingPages: "दस्तऐवजाच्या पानांमधून मजकूर काढत आहे...",
    loadingFindingAnswer: "उत्तर शोधत आहे...",
    plainSummaryTab: "साधा सारांश",
    eli15Tab: "१५ वर्षांच्या मुलाला समजावल्याप्रमाणे",
    riskAnalysisTab: "धोका विश्लेषण",
    askQuestionTab: "प्रश्न विचारा",
    readAloudButton: "▶ मोठ्याने वाचा",
    stopButton: "■ थांबा",
    copyButton: "कॉपी करा",
    copiedButton: "कॉपी केले!",
    suggestionLabel: "💡 सूचना:",
    noRisksFound: "दस्तऐवजात कोणतेही महत्त्वपूर्ण धोके आढळले नाहीत.",
    qaPlaceholder: "दस्तऐवजाबद्दल प्रश्न विचारा.",
    qaInputPlaceholder: "उदा., लवकर समाप्तीसाठी काय दंड आहे?",
    sendButton: "पाठवा",
    welcomeTitle: "लीगलईझ एआय मध्ये आपले स्वागत आहे",
    welcomeMessage1: "सुरू करण्यासाठी एक फाईल अपलोड करा.",
    welcomeMessage2: "आम्ही तुमच्या निवडलेल्या भाषेत एक साधा सारांश देऊ, धोके हायलाइट करू आणि तुमच्या प्रश्नांची उत्तरे देऊ.",
    footerDisclaimer: "अस्वीकरण: लीगलईझ एआय माहितीपूर्ण सारांश प्रदान करते आणि व्यावसायिक कायदेशीर सल्ल्याचा पर्याय नाही.",
    errorEmptyDocument: "विश्लेषण सुरू करण्यासाठी कृपया एक फाईल अपलोड करा.",
    errorAnalysis: "विश्लेषण दरम्यान त्रुटी आली। कृपया पुन्हा प्रयत्न करा.",
    errorUnsupportedFile: "असमर्थित फाईल प्रकार। कृपया .txt, .docx, .pdf, .jpg, .jpeg, .png, किंवा .webp फाईल अपलोड करा.",
    errorNoTextExtracted: "दस्तऐवजातून कोणताही मजकूर काढता आला नाही.",
    errorFileProcessing: "फाईलवर प्रक्रिया करण्यात अयशस्वी.",
    errorSpeechSynthesis: "क्षमस्व, आपल्या ब्राउझरद्वारे किंवा निवडलेल्या भाषेसाठी टेक्स्ट-टू-स्पीच समर्थित नाही.",
    errorQADefault: "क्षमस्व, मला एक त्रुटी आली। कृपया पुन्हा प्रयत्न करा.",
    pageOf: "पृष्ठ {totalPages} पैकी {currentPage}",
  },
  ta: {
    headerTitle: "லீகல்ஈஸ் AI",
    headerSubtitle: "சட்ட ஆவணங்களை எளிமையாக்குதல்",
    yourDocument: "உங்கள் ஆவணம்",
    analysisLanguageLabel: "பகுப்பாய்வு மொழி:",
    analyzedFile: "தேர்ந்தெடுக்கப்பட்ட கோப்பு",
    textareaPlaceholder: "நீங்கள் பதிவேற்றிய கோப்பின் உள்ளடக்கம் இங்கே காண்பிக்கப்படும்.",
    processingButton: "செயலாக்கத்தில் உள்ளது...",
    uploadFileButton: "கோப்பை பதிவேற்றவும்",
    analyzingButton: "பகுப்பாய்வு செய்யப்படுகிறது...",
    summarizeButton: "சுருக்கம் மற்றும் பகுப்பாய்வு",
    dismissError: "பிழையை நிராகரி",
    loadingMessageDefault: "பகுப்பாய்வு செய்யப்படுகிறது...",
    loadingSummary: "சுருக்கம் உருவாக்கப்படுகிறது...",
    loadingRisks: "ஆபத்துகளுக்காக பகுப்பாய்வு செய்யப்படுகிறது...",
    loadingELI15: "உரையை எளிமையாக்குகிறது (ELI15)...",
    loadingExtractingText: "இருந்து உரையைப் பிரித்தெடுக்கிறது",
    loadingProcessingPDF: "PDF செயலாக்கப்படுகிறது",
    loadingExtractingPages: "ஆவணப் பக்கங்களிலிருந்து உரையைப் பிரித்தெடுக்கிறது...",
    loadingFindingAnswer: "பதிலைத் தேடுகிறது...",
    plainSummaryTab: "எளிய சுருக்கம்",
    eli15Tab: "15 வயது சிறுவனுக்கு விளக்குவது போல்",
    riskAnalysisTab: "ஆபத்து பகுப்பாய்வு",
    askQuestionTab: "கேள்வி கேட்கவும்",
    readAloudButton: "▶ உரக்கப் படிக்கவும்",
    stopButton: "■ நிறுத்து",
    copyButton: "நகலெடு",
    copiedButton: "நகலெடுக்கப்பட்டது!",
    suggestionLabel: "💡 பரிந்துரை:",
    noRisksFound: "ஆவணத்தில் குறிப்பிடத்தக்க ஆபத்துகள் எதுவும் கண்டறியப்படவில்லை.",
    qaPlaceholder: "ஆவணம் குறித்து ஒரு கேள்வி கேட்கவும்.",
    qaInputPlaceholder: "எ.கா., முன்கூட்டியே முடித்தால் என்ன அபராதம்?",
    sendButton: "அனுப்பு",
    welcomeTitle: "லீகல்ஈஸ் AI-க்கு வரவேற்கிறோம்",
    welcomeMessage1: "தொடங்குவதற்கு ஒரு கோப்பைப் பதிவேற்றவும்.",
    welcomeMessage2: "நாங்கள் நீங்கள் தேர்ந்தெடுத்த மொழியில் ஒரு எளிய சுருக்கத்தை வழங்குவோம், ஆபத்துகளை முன்னிலைப்படுத்துவோம், மேலும் உங்கள் கேள்விகளுக்கு பதிலளிப்போம்.",
    footerDisclaimer: "பொறுப்புத் துறப்பு: லீகல்ஈஸ் AI தகவல் சுருக்கங்களை வழங்குகிறது மற்றும் இது தொழில்முறை சட்ட ஆலோசனைக்கு மாற்றாகாது.",
    errorEmptyDocument: "பகுப்பாய்வைத் தொடங்க, தயவுசெய்து ஒரு கோப்பைப் பதிவேற்றவும்.",
    errorAnalysis: "பகுப்பாய்வின் போது ஒரு பிழை ஏற்பட்டது। தயவுசெய்து மீண்டும் முயற்சிக்கவும்.",
    errorUnsupportedFile: "ஆதரிக்கப்படாத கோப்பு வகை। தயவுசெய்து .txt, .docx, .pdf, .jpg, .jpeg, .png, அல்லது .webp கோப்பைப் பதிவேற்றவும்.",
    errorNoTextExtracted: "ஆவணத்திலிருந்து எந்த உரையையும் பிரித்தெடுக்க முடியவில்லை.",
    errorFileProcessing: "கோப்பைச் செயலாக்க முடியவில்லை.",
    errorSpeechSynthesis: "மன்னிக்கவும், உங்கள் உலாவி அல்லது தேர்ந்தெடுக்கப்பட்ட மொழிக்கு டெக்ஸ்ட்-டு-ஸ்பீச் ஆதரிக்கப்படவில்லை.",
    errorQADefault: "மன்னிக்கவும், நான் ஒரு பிழையை எதிர்கொண்டேன்। தயவுசெய்து மீண்டும் முயற்சிக்கவும்.",
    pageOf: "பக்கம் {totalPages}-இல் {currentPage}",
  },
  gu: {
    headerTitle: "લીગલઇઝ એઆઇ",
    headerSubtitle: "કાનૂની દસ્તાવેજોને સરળ બનાવવું",
    yourDocument: "તમારો દસ્તાવેજ",
    analysisLanguageLabel: "વિશ્લેષણ ભાષા:",
    analyzedFile: "પસંદ કરેલી ફાઇલ",
    textareaPlaceholder: "તમારી અપલોડ કરેલી ફાઇલની સામગ્રી અહીં દેખાશે.",
    processingButton: "પ્રક્રિયા ચાલી રહી છે...",
    uploadFileButton: "ફાઇલ અપલોడ్ કરો",
    analyzingButton: "વિશ્લેષણ થઈ રહ્યું છે...",
    summarizeButton: "સારાંશ અને વિશ્લેષણ કરો",
    dismissError: "ભૂલને નકારો",
    loadingMessageDefault: "વિશ્લેષણ થઈ રહ્યું છે...",
    loadingSummary: "સારાંશ બનાવી રહ્યું છે...",
    loadingRisks: "જોખમો માટે વિશ્લેષણ કરી રહ્યું છે...",
    loadingELI15: "ટેક્સ્ટને સરળ બનાવી રહ્યું છે (ELI15)...",
    loadingExtractingText: "માંથી ટેક્સ્ટ કાઢી રહ્યું છે",
    loadingProcessingPDF: "પીડીએફ પર પ્રક્રિયા કરી રહ્યું છે",
    loadingExtractingPages: "દસ્તાવેજના પૃષ્ઠોમાંથી ટેક્સ્ટ કાઢી રહ્યું છે...",
    loadingFindingAnswer: "જવાબ શોધી રહ્યું છે...",
    plainSummaryTab: "સાદો સારાંશ",
    eli15Tab: "જાણે હું 15 વર્ષનો છું",
    riskAnalysisTab: "જોખમ વિશ્લેષણ",
    askQuestionTab: "પ્રશ્ન પૂછો",
    readAloudButton: "▶ મોટેથી વાંચો",
    stopButton: "■ રોકો",
    copyButton: "કૉપિ કરો",
    copiedButton: "કૉపિ થયું!",
    suggestionLabel: "💡 સૂચન:",
    noRisksFound: "દસ્તાવેજમાં કોઈ નોંધપાત્ર જોખમો મળ્યાં નથી.",
    qaPlaceholder: "દસ્તાવેજ વિશે એક પ્રશ્ન પૂછો.",
    qaInputPlaceholder: "દા.ત., સમય પહેલા સમાપ્તિ માટે શું દંડ છે?",
    sendButton: "મોકલો",
    welcomeTitle: "લીગલઇઝ એઆઇ માં આપનું સ્વાગત છે",
    welcomeMessage1: "શરૂ કરવા માટે એક ફાઇલ અપલોડ કરો.",
    welcomeMessage2: "અમે તમારી પસંદ કરેલી ભાષામાં એક સાદો સારાંશ આપીશું, જોખમોને પ્રકાશિત કરીશું, અને તમારા પ્રશ્નોના જવાબ આપીશું.",
    footerDisclaimer: "અસ્વીકરણ: લીગલઇઝ એઆઇ માહિતીપ્રદ સારાંશ પ્રદાન કરે છે અને તે વ્યાવસાયિક કાનૂની સલાહનો વિકલ્પ નથી.",
    errorEmptyDocument: "વિશ્લેષણ શરૂ કરવા માટે કૃપા કરીને એક ફાઇલ અપલોડ કરો.",
    errorAnalysis: "વિશ્લેષણ દરમિયાન એક ભૂલ આવી। કૃપા કરીને ફરી પ્રયાસ કરો.",
    errorUnsupportedFile: "અસમર્થિત ફાઇલ પ્રકાર। કૃપા કરીને .txt, .docx, .pdf, .jpg, .jpeg, .png, અથવા .webp ఫાઇલ અપલોડ કરો.",
    errorNoTextExtracted: "દસ્તાવેજમાંથી કોઈ ટેક્સ્ટ કાઢી શકાયો નથી.",
    errorFileProcessing: "ફાઇલ પર પ્રક્રિયા કરવામાં નિષ્ફળ.",
    errorSpeechSynthesis: "માફ કરશો, તમારા બ્રાઉઝર દ્વારા અથવા પસંદ કરેલી ભાષા માટે ટેક્સ્ટ-ટુ-સ્પીચ સમર્થિત નથી.",
    errorQADefault: "માફ કરશો, મને એક ભૂલ આવી। કૃપા કરીને ફરી પ્રયાસ કરો.",
    pageOf: "પૃષ્ઠ {totalPages} માંથી {currentPage}",
  },
  kn: {
    headerTitle: "ಲೀಗಲ್‌ಈಸ್ ಎಐ",
    headerSubtitle: "ಕಾನೂನು ದಾಖಲೆಗಳನ್ನು ಸರಳಗೊಳಿಸುವುದು",
    yourDocument: "ನಿಮ್ಮ ಡಾಕ್ಯುಮೆಂಟ್",
    analysisLanguageLabel: "ವಿಶ್ಲೇಷಣಾ ಭಾಷೆ:",
    analyzedFile: "ಆಯ್ಕೆಮಾಡಿದ ಫೈಲ್",
    textareaPlaceholder: "ನಿಮ್ಮ ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ಫೈಲ್‌ನ ವಿಷಯಗಳು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ.",
    processingButton: "ಸಂಸ್ಕರಿಸಲಾಗುತ್ತಿದೆ...",
    uploadFileButton: "ಫೈಲ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
    analyzingButton: "ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...",
    summarizeButton: "ಸಾರಾಂಶ ಮತ್ತು ವಿಶ್ಲೇಷಣೆ",
    dismissError: "ದೋಷವನ್ನು ವಜಾಗೊಳಿಸಿ",
    loadingMessageDefault: "విశ్లేషಿಸಲಾಗುತ್ತಿದೆ...",
    loadingSummary: "ಸಾರಾಂಶವನ್ನು ರಚಿಸಲಾಗುತ್ತಿದೆ...",
    loadingRisks: "ಅಪಾಯಗಳಿಗಾಗಿ ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...",
    loadingELI15: "ಪಠ್ಯವನ್ನು ಸರಳಗೊಳಿಸಲಾಗುತ್ತಿದೆ (ELI15)...",
    loadingExtractingText: "ದಿಂದ ಪಠ್ಯವನ್ನು ಹೊರತೆಗೆಯಲಾಗುತ್ತಿದೆ",
    loadingProcessingPDF: "ಪಿಡಿಎಫ್ ಸಂಸ್ಕರಿಸಲಾಗುತ್ತಿದೆ",
    loadingExtractingPages: "ಡಾಕ್ಯುಮೆಂಟ್ ಪುಟಗಳಿಂದ ಪಠ್ಯವನ್ನು ಹೊರತೆಗೆಯಲಾಗುತ್ತಿದೆ...",
    loadingFindingAnswer: "ಉತ್ತರವನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ...",
    plainSummaryTab: "ಸರಳ ಸಾರಾಂಶ",
    eli15Tab: "15 ವರ್ಷದವರಿಗೆ ವಿವರಿಸಿದಂತೆ",
    riskAnalysisTab: "ಅಪಾಯ ವಿಶ್ಲೇಷಣೆ",
    askQuestionTab: "ಪ್ರಶ್ನೆ ಕೇಳಿ",
    readAloudButton: "▶ ಗಟ್ಟಿಯಾಗಿ ಓದಿ",
    stopButton: "■ ನಿಲ್ಲಿಸಿ",
    copyButton: "ನಕಲಿಸಿ",
    copiedButton: "ನಕಲಿಸಲಾಗಿದೆ!",
    suggestionLabel: "💡 ಸಲಹೆ:",
    noRisksFound: "ಡಾಕ್ಯುಮೆಂಟ್‌ನಲ್ಲಿ ಯಾವುದೇ ಗಮನಾರ್ಹ ಅಪಾಯಗಳು ಕಂಡುಬಂದಿಲ್ಲ.",
    qaPlaceholder: "ಡಾಕ್ಯುಮೆಂಟ್ ಬಗ್ಗೆ ಒಂದು ಪ್ರಶ್ನೆ ಕೇಳಿ.",
    qaInputPlaceholder: "ಉದಾ., ಅವಧಿಗೆ ಮುನ್ನವೇ ಮುಕ್ತಾಯಗೊಳಿಸಿದರೆ ದಂಡವೇನು?",
    sendButton: "ಕಳುಹಿಸಿ",
    welcomeTitle: "ಲೀಗಲ್‌ಈಸ್ ಎಐಗೆ ಸ್ವಾಗತ",
    welcomeMessage1: "ಪ್ರಾರಂಭಿಸಲು ಒಂದು ಫೈಲ್ ಅನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.",
    welcomeMessage2: "ನಾವು ನೀವು ಆಯ್ಕೆ ಮಾಡಿದ ಭಾಷೆಯಲ್ಲಿ ಸರಳ ಸಾರಾಂಶವನ್ನು ಒದಗಿಸುತ್ತೇವೆ, ಅಪಾಯಗಳನ್ನು ಹೈಲೈಟ್ ಮಾಡುತ್ತೇವೆ ಮತ್ತು ನಿಮ್ಮ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸುತ್ತೇವೆ.",
    footerDisclaimer: "ಹಕ್ಕು ನಿರಾಕರಣೆ: ಲೀಗಲ್‌ಈಸ್ ಎಐ ಮಾಹಿತಿಪೂರ್ಣ ಸಾರಾಂಶಗಳನ್ನು ಒದಗಿಸುತ್ತದೆ ಮತ್ತು ಇದು ವೃತ್ತಿಪರ ಕಾನೂನು ಸಲಹೆಗೆ ಪರ್ಯಾಯವಲ್ಲ.",
    errorEmptyDocument: "ವಿಶ್ಲೇಷಣೆ ಪ್ರಾರಂಭಿಸಲು ದಯವಿಟ್ಟು ಒಂದು ಫೈಲ್ ಅನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.",
    errorAnalysis: "ವಿಶ್ಲೇಷಣೆಯ ಸಮಯದಲ್ಲಿ ದೋಷ ಸಂಭವಿಸಿದೆ। ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    errorUnsupportedFile: "ಬೆಂಬಲವಿಲ್ಲದ ಫೈಲ್ ಪ್ರಕಾರ। ದಯವಿಟ್ಟು .txt, .docx, .pdf, .jpg, .jpeg, .png, ಅಥವಾ .webp ಫೈల్ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.",
    errorNoTextExtracted: "ಡಾಕ್ಯುಮೆಂಟ್‌ನಿಂದ ಯಾವುದೇ ಪಠ್ಯವನ್ನು ಹೊರತೆಗೆಯಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
    errorFileProcessing: "ಫೈಲ್ ಸಂಸ್ಕರಿಸಲು ವಿಫಲವಾಗಿದೆ.",
    errorSpeechSynthesis: "ಕ್ಷಮಿಸಿ, ನಿಮ್ಮ ಬ್ರೌಸರ್ ಅಥವಾ ಆಯ್ಕೆಮಾಡಿದ ಭಾಷೆಗೆ ಟೆಕ್ಸ್ಟ್-ಟು-ಸ್ಪೀಚ್ ಬೆಂಬಲಿತವಾಗಿಲ್ಲ.",
    errorQADefault: "ಕ್ಷಮಿಸಿ, ನನಗೆ ದೋಷ ಎದುರಾಗಿದೆ। ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    pageOf: "{totalPages} ಪುಟಗಳಲ್ಲಿ {currentPage} ನೇ ಪುಟ",
  },
  pa: {
    headerTitle: "ਲੀਗਲਈਜ਼ ਏਆਈ",
    headerSubtitle: "ਕਾਨੂੰਨੀ ਦਸਤਾਵੇਜ਼ਾਂ ਨੂੰ ਸਰਲ ਬਣਾਉਣਾ",
    yourDocument: "ਤੁਹਾਡਾ ਦਸਤਾਵੇਜ਼",
    analysisLanguageLabel: "ਵਿਸ਼ਲੇਸ਼ਣ ਭਾਸ਼ਾ:",
    analyzedFile: "ਚੁਣੀ ਹੋਈ ਫਾਈਲ",
    textareaPlaceholder: "ਤੁਹਾਡੀ ਅੱਪਲੋਡ ਕੀਤੀ ਫਾਈਲ ਦੀ ਸਮੱਗਰੀ ਇੱਥੇ ਦਿਖਾਈ ਦੇਵੇਗੀ।",
    processingButton: "ਪ੍ਰੋਸੈਸ ਹੋ ਰਿਹਾ ਹੈ...",
    uploadFileButton: "ਫਾਈਲ ਅੱਪਲᴏਡ ਕਰੋ",
    analyzingButton: "ਵਿਸ਼ਲੇਸ਼ਣ ਹੋ ਰਿਹਾ ਹੈ...",
    summarizeButton: "ਸੰਖੇਪ ਅਤੇ ਵਿਸ਼ਲੇਸ਼ਣ ਕਰੋ",
    dismissError: "ਗਲਤੀ ਨੂੰ ਖਾਰਜ ਕਰੋ",
    loadingMessageDefault: "ਵਿਸ਼ਲੇਸ਼ਣ ਹੋ ਰਿਹਾ ਹੈ...",
    loadingSummary: "ਸੰਖੇਪ ਬਣਾਇਆ ਜਾ ਰਿਹਾ ਹੈ...",
    loadingRisks: "ਖਤਰਿਆਂ ਲਈ ਵਿਸ਼ਲੇਸ਼ਣ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ...",
    loadingELI15: "ਟੈਕਸਟ ਨੂੰ ਸਰਲ ਬਣਾਇਆ ਜਾ ਰਿਹਾ ਹੈ (ELI15)...",
    loadingExtractingText: "ਤੋਂ ਟੈਕਸਟ ਕੱਢਿਆ ਜਾ ਰਿਹਾ ਹੈ",
    loadingProcessingPDF: "PDF ਪ੍ਰੋਸੈਸ ਹੋ ਰਹੀ ਹੈ",
    loadingExtractingPages: "ਦਸਤਾਵੇਜ਼ ਦੇ ਪੰਨਿਆਂ ਤੋਂ ਟੈਕਸਟ ਕੱਢਿਆ ਜਾ ਰਿਹਾ ਹੈ...",
    loadingFindingAnswer: "ਜਵਾਬ ਲੱਭਿਆ ਜਾ ਰਿਹਾ ਹੈ...",
    plainSummaryTab: "ਸਧਾਰਨ ਸੰਖੇਪ",
    eli15Tab: "ਜਿਵੇਂ ਮੈਂ 15 ਸਾਲਾਂ ਦਾ ਹਾਂ",
    riskAnalysisTab: "ਖਤਰਾ ਵਿਸ਼ਲੇਸ਼ਣ",
    askQuestionTab: "ਸਵਾਲ ਪੁੱਛੋ",
    readAloudButton: "▶ ਉੱਚੀ ਪੜ੍ਹੋ",
    stopButton: "■ ਰੋਕੋ",
    copyButton: "ਕਾਪੀ ਕਰੋ",
    copiedButton: "ਕਾਪੀ ਹੋ ਗਿਆ!",
    suggestionLabel: "💡 ਸੁਝਾਅ:",
    noRisksFound: "ਦਸਤਾਵੇਜ਼ ਵਿੱਚ ਕੋਈ ਮਹੱਤਵਪੂਰਨ ਖਤਰਾ ਨਹੀਂ ਪਾਇਆ ਗਿਆ।",
    qaPlaceholder: "ਦਸਤਾਵੇਜ਼ ਬਾਰੇ ਇੱਕ ਸਵਾਲ ਪੁੱਛੋ।",
    qaInputPlaceholder: "ਉਦਾਹਰਨ ਲਈ, ਜਲਦੀ ਸਮਾਪਤੀ ਲਈ ਕੀ ਜੁਰਮਾਨਾ ਹੈ?",
    sendButton: "ਭੇਜੋ",
    welcomeTitle: "ਲੀਗਲਈਜ਼ ਏਆਈ ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ",
    welcomeMessage1: "ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਇੱਕ ਫਾਈਲ ਅੱਪਲᴏਡ ਕਰੋ।",
    welcomeMessage2: "ਅਸੀਂ ਤੁਹਾਡੀ ਚੁਣੀ ਹੋਈ ਭਾਸ਼ਾ ਵਿੱਚ ਇੱਕ ਸਧਾਰਨ ਸੰਖੇਪ ਪ੍ਰਦਾਨ ਕਰਾਂਗੇ, ਖਤਰਿਆਂ ਨੂੰ ਉਜਾਗਰ ਕਰਾਂਗੇ, ਅਤੇ ਤੁਹਾਡੇ ਸਵਾਲਾਂ ਦੇ ਜਵਾਬ ਦੇਵਾਂਗੇ।",
    footerDisclaimer: "ਬੇਦਾਅਵਾ: ਲੀਗਲਈਜ਼ ਏਆਈ ਸਿਰਫ ਜਾਣਕਾਰੀ ਭਰਪੂਰ ਸੰਖੇਪ ਪ੍ਰਦਾਨ ਕਰਦਾ ਹੈ ਅਤੇ ਇਹ ਪੇਸ਼ੇਵਰ ਕਾਨੂੰਨੀ ਸਲਾਹ ਦਾ ਬਦਲ ਨਹੀਂ ਹੈ।",
    errorEmptyDocument: "ਵਿਸ਼ਲੇਸ਼ਣ ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਫਾਈਲ ਅੱਪਲੋਡ ਕਰੋ।",
    errorAnalysis: "ਵਿਸ਼ਲੇਸ਼ਣ ਦੌਰਾਨ ਇੱਕ ਗਲਤੀ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
    errorUnsupportedFile: "ਅਸਮਰਥਿਤ ਫਾਈਲ ਕਿਸਮ। ਕਿਰਪਾ ਕਰਕੇ .txt, .docx, .pdf, .jpg, .jpeg, .png, ਜਾਂ .webp ਫਾਈਲ ਅੱਪਲᴏਡ ਕਰੋ।",
    errorNoTextExtracted: "ਦਸਤਾਵੇਜ਼ ਤੋਂ ਕੋਈ ਟੈਕਸਟ ਨਹੀਂ ਕੱਢਿਆ ਜਾ ਸਕਿਆ।",
    errorFileProcessing: "ਫਾਈਲ ਨੂੰ ਪ੍ਰੋਸੈਸ ਕਰਨ ਵਿੱਚ ਅਸਫਲ।",
    errorSpeechSynthesis: "ਮਾਫ ਕਰਨਾ, ਤੁਹਾਡੇ ਬ੍ਰਾਊਜ਼ਰ ਦੁਆਰਾ ਜਾਂ ਚੁਣੀ ਗਈ ਭਾਸ਼ਾ ਲਈ ਟੈਕਸਟ-ਟੂ-ਸਪੀਚ ਸਮਰਥਿਤ ਨਹੀਂ ਹੈ।",
    errorQADefault: "ਮਾਫ ਕਰਨਾ, ਮੈਨੂੰ ਇੱਕ ਗਲਤੀ ਆਈ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
    pageOf: "ਪੰਨਾ {totalPages} ਵਿੱਚੋਂ {currentPage}",
  }
};


const App = () => {
  const [documentText, setDocumentText] = useState(''); // For the read-only textarea display
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analyzedText, setAnalyzedText] = useState(''); // For Q&A context
  const [summary, setSummary] = useState('');
  const [risks, setRisks] = useState([]);
  const [eli15, setEli15] = useState('');
  const [qaHistory, setQaHistory] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  const [language, setLanguage] = useState('en');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedEli15, setCopiedEli15] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingTab, setSpeakingTab] = useState(null);
  const [voices, setVoices] = useState([]);
  const [theme, setTheme] = useState('light');

  const chatRef = useRef(null);
  const chatLanguageRef = useRef(null);
  const qaHistoryRef = useRef(null);
  const aiClientRef = useRef(null); // Ref to hold the AI client instance
  
  const t = translations[language] || translations.en;

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  // Lazily initialize and get the AI client. This prevents crashing on load.
  const getAiClient = () => {
    if (!aiClientRef.current) {
      aiClientRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return aiClientRef.current;
  };

  // Auto-scroll for Q&A
  useEffect(() => {
    if (qaHistoryRef.current) {
      qaHistoryRef.current.scrollTop = qaHistoryRef.current.scrollHeight;
    }
  }, [qaHistory]);
    
  // Load speech synthesis voices
  useEffect(() => {
    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    loadVoices(); // Initial load for browsers that have them ready
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  // Cleanup speech synthesis on component unmount or state changes
  useEffect(() => {
    return () => {
        window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setSpeakingTab(null);
    }
  }, [activeTab, language]);

  const runAnalysis = useCallback(async (textToAnalyze) => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingTab(null);

    if (!textToAnalyze.trim()) {
      setError(t.errorNoTextExtracted); // Use more specific error
      setIsLoading(false);
      return;
    }
    
    setError('');
    // Note: isLoading is already true from the calling function `handleStartAnalysis`
    setSummary('');
    setRisks([]);
    setEli15('');
    setQaHistory([]);
    chatRef.current = null; // Reset chat

    const languageName = INDIAN_LANGUAGES.find(l => l.code === language)?.name || 'English';
    const languageInstruction = ` Respond ONLY in ${languageName}.`;

    try {
      const ai = getAiClient();
      setLoadingMessage(t.loadingSummary);
      const summaryPromise = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are a legal expert. Summarize the following legal text in plain, easy-to-understand language. Use markdown.${languageInstruction} Legal Text: \n\n${textToAnalyze}`,
      });

      setLoadingMessage(t.loadingRisks);
      const risksPromise = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an AI legal assistant. Analyze the following legal text for risks. For each risk, identify the clause, explain the risk, and provide a concrete, actionable suggestion.${languageInstruction} Legal Text: \n\n${textToAnalyze}`,
        config: {
          responseMimeType: 'application/json',
          // Fix: Use `Type` enum for responseSchema as per coding guidelines.
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              risks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    clause: { type: Type.STRING, description: 'The specific risky clause.' },
                    explanation: { type: Type.STRING, description: 'Why this is a risk.' },
                    suggestion: { type: Type.STRING, description: 'An actionable suggestion for the user.' },
                  },
                },
              },
            },
          },
        },
      });

      setLoadingMessage(t.loadingELI15);
       const eli15Promise = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Explain the following legal text like I'm 15 years old. Use simple words and analogies.${languageInstruction} Legal Text: \n\n${textToAnalyze}`,
      });

      // Use Promise.allSettled for more robust error handling
      const results = await Promise.allSettled([summaryPromise, risksPromise, eli15Promise]);
      const [summaryResult, risksResult, eli15Result] = results;

      let hasError = false;

      // Process summary
      if (summaryResult.status === 'fulfilled' && summaryResult.value.text) {
        setSummary(summaryResult.value.text);
      } else {
        console.error("Summary analysis failed:", summaryResult.status === 'rejected' ? summaryResult.reason : 'Empty response');
        hasError = true;
      }
      
      // Process ELI15
      if (eli15Result.status === 'fulfilled' && eli15Result.value.text) {
          setEli15(eli15Result.value.text);
      } else {
          console.error("ELI15 analysis failed:", eli15Result.status === 'rejected' ? eli15Result.reason : 'Empty response');
          // Non-critical, don't set hasError
      }

      // Process risks
      if (risksResult.status === 'fulfilled' && risksResult.value.text) {
        try {
          const parsedRisks = JSON.parse(risksResult.value.text.trim());
          setRisks(parsedRisks.risks || []);
        } catch (e) {
          console.error("Failed to parse risks JSON:", e);
          console.error("Received text for risks:", risksResult.value.text);
          setRisks([]); // Default to no risks on parse error
          hasError = true; // Parsing is a critical failure
        }
      } else {
        console.error("Risks analysis failed:", risksResult.status === 'rejected' ? risksResult.reason : 'Empty response');
        setRisks([]); // Default to no risks on API failure
        hasError = true;
      }
      
      setAnalyzedText(textToAnalyze); // Save context for Q&A

      if (hasError) {
        setError(t.errorAnalysis);
      }

      setActiveTab('summary');

    } catch (err) {
      console.error(err);
      setError(t.errorAnalysis);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [language, t]);

  const extractTextFromImage = useCallback(async (file) => {
    setLoadingMessage(`${t.loadingExtractingText} ${file.name}...`);
    // Fix: Specify the Promise generic type to ensure `base64` is a string.
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error('Failed to read file as data URL.'));
        }
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });

    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { text: "Extract all text from this document image. Preserve formatting like paragraphs and line breaks where possible." },
                { inlineData: { mimeType: file.type, data: base64 } }
            ]
        }
    });
    return response.text;
  }, [t]);

  const extractTextFromPdf = useCallback(async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageImageParts = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const pageMessage = t.pageOf.replace('{currentPage}', i).replace('{totalPages}', pdf.numPages);
        setLoadingMessage(`${t.loadingProcessingPDF} (${pageMessage})...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (!context) {
            throw new Error('Could not get canvas context.');
        }

        await page.render({ canvas: canvas, canvasContext: context, viewport: viewport }).promise;

        const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
        pageImageParts.push({ inlineData: { mimeType: 'image/jpeg', data: base64 } });
    }

    setLoadingMessage(t.loadingExtractingPages);
    const prompt = [
        { text: "Extract all text from the following document pages. Combine the text from all pages into a single cohesive document, preserving formatting like paragraphs where possible." },
        ...pageImageParts
    ];

    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: prompt }
    });
    return response.text;
  }, [t]);

  const extractTextFromDocx = useCallback(async (file) => {
    setLoadingMessage(`${t.loadingExtractingText} ${file.name}...`);
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }, [t]);

  const handleFileUpload = useCallback((file: File | null) => {
    if (!file) return;

    // Reset UI state for the new file
    setError('');
    setSummary('');
    setRisks([]);
    setEli15('');
    setQaHistory([]);
    setAnalyzedText('');
    chatRef.current = null;
    setActiveTab('summary');

    setUploadedFile(file);
    setDocumentText(''); // Clear previous file's text
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // Reset file input to allow re-uploading the same file
    if (event.target) event.target.value = '';
  };

  const handleStartAnalysis = useCallback(async () => {
    // This is the single entry point for all analysis, triggered by the button.
    if (!uploadedFile) {
        setError(t.errorEmptyDocument);
        return;
    }

    setIsLoading(true);
    setError('');
    
    try {
        let extractedText = '';
        if (uploadedFile.type === 'text/plain') {
            extractedText = await uploadedFile.text();
        } else if (uploadedFile.type === 'application/pdf') {
            extractedText = await extractTextFromPdf(uploadedFile);
        } else if (uploadedFile.type.startsWith('image/')) {
            extractedText = await extractTextFromImage(uploadedFile);
        } else if (uploadedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            extractedText = await extractTextFromDocx(uploadedFile);
        } else {
            throw new Error(t.errorUnsupportedFile);
        }

        if (!extractedText || !extractedText.trim()) {
            throw new Error(t.errorNoTextExtracted);
        }
        setDocumentText(extractedText); // Show extracted text in the read-only textarea
        
        // Now that we have the text, run the summary/risk analysis.
        await runAnalysis(extractedText);

    } catch (err) {
        const errorMessage = (err instanceof Error) ? err.message : t.errorFileProcessing;
        setError(errorMessage);
        setIsLoading(false); // Ensure loading stops on extraction error
        setLoadingMessage('');
    }
  }, [uploadedFile, runAnalysis, t, extractTextFromDocx, extractTextFromImage, extractTextFromPdf]);

  const handleQaSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!currentQuestion.trim() || !analyzedText) return;
    
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingTab(null);

    const question = currentQuestion;
    setCurrentQuestion('');
    
    // If language has changed since chat started, reset chat
    if (chatRef.current && chatLanguageRef.current !== language) {
      chatRef.current = null;
      setQaHistory([]);
    }

    setIsLoading(true);
    setLoadingMessage(t.loadingFindingAnswer);
    
    const languageName = INDIAN_LANGUAGES.find(l => l.code === language)?.name || 'English';

    if (!chatRef.current) {
        const systemInstruction = `You are a helpful AI legal assistant. Your task is to answer user questions about the provided legal document.
1.  **Prioritize the Document:** First, always try to answer based on the text of the document provided below.
2.  **Use General Knowledge:** If the document doesn't contain the answer, you can use your general knowledge to explain related legal concepts, suggest potential solutions for risks, or answer 'what if' questions.
3.  **Language:** Respond ONLY in ${languageName}.
4.  **Disclaimer:** IMPORTANT: Conclude EVERY response with the following disclaimer on a new line: "${t.footerDisclaimer}"

LEGAL DOCUMENT CONTEXT:
---
${analyzedText}
---`;
        
        const ai = getAiClient();
        chatRef.current = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: [
                { role: 'user', parts: [{ text: systemInstruction }] },
                { role: 'model', parts: [{ text: `Understood. I will answer questions about the document, use my general knowledge when needed, respond in ${languageName}, and always include the disclaimer.` }] }
            ],
        });
        chatLanguageRef.current = language;
    }

    setQaHistory(prev => [...prev, { role: 'user', text: question }]);

    try {
        const stream = await chatRef.current.sendMessageStream({ message: question });
        setIsLoading(false);
        setLoadingMessage('');

        let aiResponse = '';
        setQaHistory(prev => [...prev, { role: 'ai', text: '...' }]);
        
        for await (const chunk of stream) {
            aiResponse += chunk.text;
            setQaHistory(prev => {
                const newHistory = [...prev];
                newHistory[newHistory.length - 1] = { role: 'ai', text: aiResponse };
                return newHistory;
            });
        }
    } catch (err) {
      console.error(err);
      setQaHistory(prev => [...prev, { role: 'ai', text: t.errorQADefault }]);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [currentQuestion, analyzedText, language, t]);

  const handleCopy = (text, type) => {
      navigator.clipboard.writeText(text);
      if (type === 'summary') {
          setCopiedSummary(true);
          setTimeout(() => setCopiedSummary(false), 2000);
      } else {
          setCopiedEli15(true);
          setTimeout(() => setCopiedEli15(false), 2000);
      }
  };

  const handleReadAloud = useCallback((text, tab) => {
      // Stop any current speech if the same button is clicked again
      if (isSpeaking && speakingTab === tab) {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
          setSpeakingTab(null);
          return;
      }

      window.speechSynthesis.cancel(); // Stop any other speech

      // Check for browser support
      if (!('speechSynthesis' in window) || !window.speechSynthesis) {
          setError(t.errorSpeechSynthesis);
          return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;

      // Use the pre-loaded voices from state for matching
      const voice = voices.find(v => v.lang.startsWith(language));
      if (voice) {
          utterance.voice = voice;
      }

      utterance.onend = () => {
          setIsSpeaking(false);
          setSpeakingTab(null);
      };

      // Improved error handling
      utterance.onerror = (e) => {
          // Browsers often fire "interrupted" or "canceled" errors when speech is stopped manually.
          // We can safely ignore these as they are not true errors.
          if (e.error === 'interrupted' || e.error === 'canceled') {
              console.warn(`Speech synthesis gracefully stopped: ${e.error}`);
              setIsSpeaking(false);
              setSpeakingTab(null);
              return;
          }
          console.error(`Speech synthesis error: ${e.error}`, e);
          setIsSpeaking(false);
          setSpeakingTab(null);
          setError(t.errorSpeechSynthesis);
      };

      // If voices are not loaded yet, this might fail, but now we have better error logging
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      setSpeakingTab(tab);
  }, [isSpeaking, speakingTab, language, voices, t]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };


  return (
    <div className="container">
      <header>
          <div className="header-content">
              <div className="logo-container">
                  <svg className="logo" width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 7L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 7L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 4.5L17 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div className="logo-text">
                      <h1>{t.headerTitle}</h1>
                      <p>{t.headerSubtitle}</p>
                  </div>
              </div>
              <button onClick={toggleTheme} className="theme-toggle-button" aria-label="Toggle theme">
                  {theme === 'light' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                  ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                  )}
              </button>
          </div>
      </header>
      <main>
        <div 
          className={`panel input-panel ${isDraggingOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <h2>{t.yourDocument}</h2>
           <div className="language-selector-wrapper">
            <label htmlFor="language-select">{t.analysisLanguageLabel}</label>
            <select id="language-select" value={language} onChange={e => setLanguage(e.target.value)} disabled={isLoading}>
              {INDIAN_LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
            </select>
          </div>
           {uploadedFile && <div className="file-info">{t.analyzedFile}: {uploadedFile.name}</div>}
          <textarea
            value={documentText}
            placeholder={t.textareaPlaceholder}
            aria-label="Legal document input"
            readOnly
          />
          <div className="actions">
            <label htmlFor="file-upload" className={`button file-button ${isLoading ? 'disabled' : ''}`}>
              {t.uploadFileButton}
            </label>
            <input id="file-upload" type="file" accept=".txt,.pdf,.jpg,.jpeg,.png,.webp,.docx" onChange={handleFileChange} disabled={isLoading} />
            <button onClick={handleStartAnalysis} disabled={isLoading || !uploadedFile}>
              { isLoading ? t.analyzingButton : t.summarizeButton}
            </button>
          </div>
           {error && 
            <div className="error-box" role="alert">
              <span>{error}</span>
              <button onClick={() => setError('')} aria-label={t.dismissError}>&times;</button>
            </div>
           }
        </div>

        <div className="panel output-panel">
          {isLoading ? (
            <div className="loading-container" role="status" aria-live="polite">
              <div className="spinner"></div>
              <p>{loadingMessage || t.loadingMessageDefault}</p>
            </div>
          ) : (summary || risks.length > 0 || eli15) ? (
            <>
              <div className="tabs">
                <button onClick={() => setActiveTab('summary')} className={activeTab === 'summary' ? 'active' : ''}>{t.plainSummaryTab}</button>
                 <button onClick={() => setActiveTab('eli15')} className={activeTab === 'eli15' ? 'active' : ''}>{t.eli15Tab}</button>
                <button onClick={() => setActiveTab('risks')} className={activeTab === 'risks' ? 'active' : ''}>
                  {t.riskAnalysisTab} {risks.length > 0 && <span className="risk-count">{risks.length}</span>}
                </button>
                <button onClick={() => setActiveTab('qa')} className={activeTab === 'qa' ? 'active' : ''}>{t.askQuestionTab}</button>
              </div>
              <div className="tab-content">
                {activeTab === 'summary' && <div className="content-wrapper tab-pane">
                    <div className="content-header">
                        {language === 'en' && (
                          <button className="read-aloud-button" onClick={() => handleReadAloud(summary, 'summary')}>
                             {isSpeaking && speakingTab === 'summary' ? t.stopButton : t.readAloudButton}
                          </button>
                        )}
                        <button className="copy-button" onClick={() => handleCopy(summary, 'summary')}>{copiedSummary ? t.copiedButton : t.copyButton}</button>
                    </div>
                    <div className="summary-content" dangerouslySetInnerHTML={{__html: summary ? marked.parse(summary) : ''}}/>
                </div>}

                {activeTab === 'eli15' && <div className="content-wrapper tab-pane">
                    <div className="content-header">
                        {language === 'en' && (
                            <button className="read-aloud-button" onClick={() => handleReadAloud(eli15, 'eli15')}>
                                {isSpeaking && speakingTab === 'eli15' ? t.stopButton : t.readAloudButton}
                            </button>
                        )}
                        <button className="copy-button" onClick={() => handleCopy(eli15, 'eli15')}>{copiedEli15 ? t.copiedButton : t.copyButton}</button>
                    </div>
                    <div className="summary-content" dangerouslySetInnerHTML={{__html: eli15 ? marked.parse(eli15) : ''}}/>
                </div>}
                
                {activeTab === 'risks' && (
                  <div className="risks-content tab-pane">
                    {risks.length > 0 ? risks.map((risk, index) => (
                      <div key={index} className="risk-item">
                        <h3>{risk.clause}</h3>
                        <p>{risk.explanation}</p>
                        <div className="risk-suggestion">
                           <p><strong>{t.suggestionLabel}</strong> {risk.suggestion}</p>
                        </div>
                      </div>
                    )) : <p>{t.noRisksFound}</p>}
                  </div>
                )}
                
                {activeTab === 'qa' && (
                  <div className="qa-content tab-pane">
                    <div className="qa-history" ref={qaHistoryRef}>
                      {qaHistory.length === 0 && <p className="placeholder-text">{t.qaPlaceholder}</p>}
                      {qaHistory.map((entry, index) => (
                        <div key={index} className={`qa-message ${entry.role}`}>
                          <p dangerouslySetInnerHTML={{__html: marked.parse(entry.text.replace('...', '...&nbsp;'))}} />
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleQaSubmit} className="qa-form">
                      <input
                        type="text"
                        value={currentQuestion}
                        onChange={(e) => setCurrentQuestion(e.target.value)}
                        placeholder={t.qaInputPlaceholder}
                        aria-label="Ask a question about the document"
                        disabled={!analyzedText || isLoading}
                      />
                      <button type="submit" disabled={!currentQuestion || isLoading}>{t.sendButton}</button>
                    </form>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="placeholder-container">
                <h2>{t.welcomeTitle}</h2>
                <p>{t.welcomeMessage1}</p>
                <p>{t.welcomeMessage2}</p>
            </div>
          )}
        </div>
      </main>
      <footer>
        <p>{t.footerDisclaimer}</p>
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);