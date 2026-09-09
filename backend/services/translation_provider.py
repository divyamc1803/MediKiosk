import os
import requests
from typing import Optional

class TranslationProvider:
    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        raise NotImplementedError

class BhashiniTranslationProvider(TranslationProvider):
    def __init__(self):
        self.url = os.getenv("BHASHINI_PIPELINE_URL", "https://dhruva-api.bhashini.gov.in/services/inference/pipeline")
        self.key = os.getenv("BHASHINI_API_KEY", "").strip()
        self.service_id = os.getenv("BHASHINI_TRANSLATION_SERVICE_ID", "").strip()

    @property
    def configured(self) -> bool:
        return bool(self.key and self.service_id)

    def status(self):
        return {
            "provider": "bhashini",
            "configured": self.configured,
            "missing": [x for x, ok in (("BHASHINI_API_KEY", bool(self.key)), ("BHASHINI_TRANSLATION_SERVICE_ID", bool(self.service_id))) if not ok],
        }

    OFFLINE_CLINICAL_MAP = {
        "hi": {
            "what brings you here today?": "आज आप यहाँ किस समस्या या कारण से आए हैं?",
            "when did this problem start?": "यह समस्या कब शुरू हुई थी?",
            "can you describe your symptoms?": "क्या आप अपने लक्षणों के बारे में विस्तार से बता सकते हैं?",
            "where exactly are you experiencing the problem?": "आपको शरीर में ठीक कहाँ पर यह समस्या या दर्द महसूस हो रहा है?",
            "how severe is it?": "यह समस्या या दर्द कितना गंभीर है?",
            "has it been getting better, worse, or staying the same?": "क्या यह पहले से बेहतर हो रहा है, बढ़ रहा है, या वैसा ही बना हुआ है?",
            "does anything make it better or worse?": "क्या किसी चीज़ से आराम मिलता है या यह बढ़ जाता है?",
            "have you experienced this problem before?": "क्या आपको पहले भी कभी ऐसी समस्या हुई है?",
            "do you have any existing medical conditions?": "क्या आपको पहले से कोई बीमारी है (जैसे शुगर, बीपी, थायरॉइड, दमा आदि)?",
            "are you currently taking any medicines?": "क्या आप इस समय कोई दवाइयाँ ले रहे हैं?",
            "do you have any known allergies?": "क्या आपको किसी दवा, खाने की चीज़ या अन्य किसी वस्तु से एलर्जी है?",
            "have you had any recent tests, scans, or medical consultations?": "क्या आपने हाल ही में कोई मेडिकल जांच, स्कैन या डॉक्टर से परामर्श लिया है?",
            "have you had any recent surgery or hospitalization?": "क्या हाल ही में आपकी कोई सर्जरी (ऑपरेशन) हुई है या आप अस्पताल में भर्ती रहे हैं?",
            "is there anything else about your health that you think the doctor should know?": "क्या आपकी सेहत के बारे में कोई अन्य महत्वपूर्ण बात है जो डॉक्टर को जाननी चाहिए?",
            "is everything you provided correct, or would you like to change anything?": "क्या आपके द्वारा दी गई सभी जानकारियाँ सही हैं, या आप कुछ बदलना चाहते हैं?",
            "thank you. your clinical intake is complete and your summary is ready for doctor review.": "धन्यवाद। आपकी स्वास्थ्य जानकारी दर्ज कर ली गई है और डॉक्टर की समीक्षा के लिए तैयार है।",
            "does the discomfort spread to your left arm, shoulder, neck, or jaw?": "क्या यह दर्द या बेचैनी आपके बाएँ हाथ, कंधे, गर्दन या जबड़े की तरफ फैलती है?",
            "could you please name the main medicines you take regularly?": "कृपया बताएं कि आप नियमित रूप से कौन सी मुख्य दवाइयाँ लेते हैं?",
            "chest discomfort": "सीने में तकलीफ",
            "fever & chills": "बुखार और ठंड",
            "stomach pain": "पेट दर्द",
            "cough & cold": "खांसी और जुकाम",
            "joint / body pain": "जोड़ों या बदन में दर्द",
            "just started today": "आज ही शुरू हुआ",
            "1-2 days ago": "1-2 दिन पहले",
            "about a week ago": "लगभग एक सप्ताह पहले",
            "more than a month ago": "एक महीने से अधिक पहले",
            "sharp / throbbing pain": "तेज़ या चुभन भरा दर्द",
            "dull continuous ache": "हल्का लगातार दर्द",
            "burning sensation": "जलन का अहसास",
            "pressure or heaviness": "दबाव या भारीपन",
            "weakness & fatigue": "कमजोरी और थकान",
            "chest": "छाती / सीना",
            "abdomen / stomach": "पेट",
            "head / neck": "सिर / गर्दन",
            "back": "पीठ",
            "joints / limbs": "जोड़ / हाथ-पैर",
            "all over the body": "पूरे शरीर में",
            "mild (1-3)": "हल्का (1-3)",
            "moderate (4-6)": "मध्यम (4-6)",
            "severe (7-8)": "गंभीर (7-8)",
            "very severe (9-10)": "अत्यधिक गंभीर (9-10)",
            "getting worse": "बढ़ रहा है",
            "staying the same": "वैसा ही बना हुआ है",
            "getting better": "पहले से बेहतर है",
            "comes and goes in episodes": "रुक-रुक कर आता है",
            "rest helps": "आराम करने से फायदा होता है",
            "medicine helps": "दवा से आराम मिलता है",
            "movement makes it worse": "हिलने-डुलने से बढ़ता है",
            "food makes it worse": "खाने से बढ़ता है",
            "nothing seems to change it": "कोई खास असर नहीं पड़ता",
            "no, this is the first time": "नहीं, यह पहली बार है",
            "yes, occasionally": "हाँ, कभी-कभी",
            "yes, frequently / chronic": "हाँ, अक्सर / पुराना रोग",
            "high blood pressure": "उच्च रक्तचाप (बीपी)",
            "asthma / respiratory": "अस्थमा / सांस की समस्या",
            "heart disease": "हृदय रोग",
            "thyroid": "थायरॉइड",
            "regular prescription medicines": "नियमित पर्चे की दवाइयाँ",
            "painkillers / over-the-counter": "दर्द निवारक / सामान्य दवाइयाँ",
            "ayurvedic / herbal supplements": "आयुर्वेदिक / हर्बल दवाइयाँ",
            "no known allergies": "कोई ज्ञात एलर्जी नहीं",
            "penicillin / antibiotics": "पेनिसिलिन / एंटीबायोटिक्स",
            "sulfa drugs": "सल्फा दवाइयाँ",
            "food allergies": "भोजन से एलर्जी",
            "dust / pollen": "धूल / पराग",
            "no recent tests": "हाल में कोई जांच नहीं",
            "blood tests": "खून की जांच",
            "x-ray / ct / mri scan": "एक्स-रे / सीटी / एमआरआई स्कैन",
            "recent doctor consultation": "हाल ही में डॉक्टर से परामर्श",
            "no surgery or hospitalization": "कोई सर्जरी या भर्ती नहीं",
            "recent surgery (past 6 months)": "हालिया सर्जरी (पिछले 6 महीने)",
            "past surgery (earlier)": "पुरानी सर्जरी",
            "recent hospital admission": "हाल में अस्पताल में भर्ती",
            "nothing else, that covers everything": "और कुछ नहीं, सब बता दिया",
            "smoker / tobacco use": "धूम्रपान / तंबाकू सेवन",
            "alcohol consumption": "शराब का सेवन",
            "high stress / sleep issues": "तनाव / नींद की समस्या",
            "family history of illness": "परिवार में बीमारी का इतिहास",
            "everything is correct": "सभी जानकारी सही है",
            "i would like to change something": "मैं कुछ बदलना चाहता/चाहती हूँ",
            "no, stays in chest": "नहीं, सिर्फ छाती में रहता है",
            "spreads to left arm": "बाएँ हाथ में फैलता है",
            "spreads to neck / jaw": "गर्दन या जबड़े में फैलता है",
            "spreads to back": "पीठ की तरफ फैलता है",
            "blood pressure medicine": "बीपी की दवा",
            "diabetes medicine": "शुगर की दवा",
            "blood thinner / aspirin": "खून पतला करने की दवा / एस्पिरिन",
            "pain medicine": "दर्द की दवा",
            "what brings you to the hospital today?": "आज आप अस्पताल किस कारण से आए हैं?",
            "what is your main problem today?": "आज आपकी मुख्य समस्या क्या है?",
            "when did this problem first start?": "यह समस्या पहली बार कब शुरू हुई?",
            "where exactly are you feeling the problem or pain?": "आपको वास्तव में कहाँ समस्या या दर्द महसूस हो रहा है?",
            "where exactly does it hurt?": "आपको कहाँ दर्द हो रहा है?",
            "how would you describe it — sharp, dull, burning, pressure, or something else?": "आप दर्द को कैसे बताएंगे — तेज़ चुभन, हल्का भारीपन, जलन या दबाव?",
            "how would you describe the pain?": "दर्द कैसा महसूस होता है?",
            "on a scale from 0 to 10, how severe is it right now?": "0 से 10 के पैमाने पर, अभी यह कितना गंभीर है?",
            "how severe is it from zero to ten?": "शून्य से दस तक, दर्द कितना तेज़ है?",
            "how long does it usually last?": "यह दर्द आमतौर पर कितनी देर तक रहता है?",
            "does anything make it worse?": "क्या किसी चीज़ से यह दर्द बढ़ जाता है?",
            "does anything make it feel better?": "क्या किसी चीज़ से आराम मिलता है?",
            "are you experiencing any other symptoms along with this?": "क्या इसके साथ आपको कोई अन्य लक्षण भी महसूस हो रहे हैं?",
            "are you having any other symptoms?": "क्या आपको कोई अन्य परेशानी हो रही है?",
            "do you have any ongoing or previous medical conditions, such as diabetes, high blood pressure, or asthma?": "क्या आपको पहले से कोई बीमारी है, जैसे मधुमेह (शुगर), उच्च रक्तचाप (बीपी) या अस्थमा?",
            "do you have any previous or ongoing medical conditions?": "क्या आपको पहले से कोई पुरानी बीमारी है?",
            "have you ever had any surgeries or major procedures?": "क्या आपका पहले कभी कोई ऑपरेशन या सर्जरी हुई है?",
            "have you had any surgeries or major procedures?": "क्या आपकी कोई सर्जरी हुई है?",
            "are you currently taking any medicines or supplements?": "क्या आप अभी कोई दवाइयाँ या सप्लीमेंट्स ले रहे हैं?",
            "are you taking any medicines or supplements?": "क्या आप नियमित रूप से कोई दवा ले रहे हैं?",
            "do you have any allergies to medicines, food, or anything else?": "क्या आपको किसी दवा, भोजन या अन्य चीज़ से एलर्जी है?",
            "are you allergic to any medicines or food?": "क्या आपको किसी दवा या खाने से एलर्जी है?",
            "does anyone in your close family have an important medical condition?": "क्या आपके परिवार में किसी को दिल की बीमारी, शुगर या कोई गंभीर समस्या है?",
            "does anyone in your family have an important medical condition?": "क्या परिवार में किसी को कोई बड़ी बीमारी है?",
            "is there anything about your smoking, alcohol, diet, work, or daily habits that you would like us to know?": "क्या आप धूम्रपान, शराब, आहार या अपनी दिनचर्या के बारे में कुछ बताना चाहेंगे?",
            "tell me about any important daily habits or lifestyle factors.": "अपनी दिनचर्या या जीवनशैली के बारे में बताएं।",
            "apart from what we discussed, are you having any other new or unusual symptoms?": "जो हमने चर्चा की उसके अलावा, क्या आपको कोई अन्य नया लक्षण महसूस हो रहा है?",
            "are you having any other new or unusual symptoms?": "क्या कोई अन्य नई समस्या है?",
            "if you know it, what is your prakriti or body constitution?": "यदि आपको पता है, तो आपकी प्रकृति (वात, पित्त, कफ) क्या है?",
            "do you know your prakriti?": "क्या आपको अपनी प्रकृति पता है?",
            "how would you describe your digestion or agni?": "आप अपनी पाचन शक्ति (अग्नि) को कैसा बताएंगे?",
            "how would you describe your digestion?": "आपकी पाचन क्रिया कैसी है?",
            "how would you describe your bowel pattern or koshta?": "आपका पेट साफ होने की स्थिति (कोष्ठ) कैसी रहती है?",
            "how would you describe your bowel pattern?": "शौच की आदत कैसी है?",
            "please tell me briefly about your usual diet.": "कृपया अपने सामान्य खान-पान के बारे में संक्षेप में बताएं।",
            "tell me about your usual diet.": "अपने सामान्य भोजन के बारे में बताएं।",
            "how is your usual sleep?": "आपकी नींद कैसी रहती है?",
            "how is your sleep?": "नींद कैसी आती है?",
            "is there anything important about your daily routine or lifestyle?": "क्या आपकी दिनचर्या के बारे में कुछ महत्वपूर्ण है?",
            "do you have any medical reports, prescriptions, or other documents you would like to add?": "क्या आपके पास कोई पुरानी पर्ची, जांच रिपोर्ट या मेडिकल दस्तावेज़ हैं?",
            "do you have any medical documents to add?": "क्या कोई मेडिकल रिपोर्ट अपलोड करना चाहते हैं?",
            "thank you. i have recorded your answers. you can review them before they are sent to the clinician.": "धन्यवाद। मैंने आपके उत्तर दर्ज कर लिए हैं। डॉक्टर को भेजने से पहले आप इनकी समीक्षा कर सकते हैं।",
            "your clinical history has been recorded and is ready for review by the clinician.": "आपका चिकित्सा इतिहास दर्ज हो गया है और डॉक्टर की समीक्षा के लिए तैयार है।",
            "hello": "नमस्ते",
            "yes": "हाँ",
            "no": "नहीं",
            "none": "कोई नहीं",
            "other": "अन्य",
            "fever": "बुखार",
            "headache": "सिरदर्द",
            "stomach pain": "पेट दर्द",
            "chest pain": "सीने में दर्द",
            "sharp": "तीज़ चुभने वाला",
            "dull": "हल्का मीठा दर्द",
            "burning": "जलन",
            "pressure": "दबाव / भारीपन",
            "nausea": "जी मिचलाना",
            "vomiting": "उल्टी",
            "breathlessness": "साँस फूलना",
            "rest": "आराम",
            "medicine": "दवा",
            "food": "भोजन",
            "movement": "चलने-फिरने से",
            "stress": "तनाव",
            "diabetes": "मधुमेह (शुगर)",
            "high blood pressure": "उच्च रक्तचाप (बीपी)",
            "asthma": "अस्थमा / दमा",
            "heart disease": "हृदय रोग",
            "no allergies": "कोई एलर्जी नहीं",
            "penicillin": "पेनिसिलिन",
            "sulfa drugs": "सल्फा दवाइयाँ",
            "peanuts": "मूँगफली",
            "smoking": "धूम्रपान",
            "alcohol": "शराब",
            "regular": "नियमित",
            "hard": "कड़ा / कब्ज",
            "loose": "पतले दस्त",
            "strong": "मजबूत / अच्छी",
            "variable": "अनियमित",
            "slow": "धीमी / मंद",
            "good": "अच्छी",
            "poor": "खराब",
            "interrupted": "टूटी-फूटी नींद",
            "please rest": "कृपया आराम करें",
            "take this medicine": "यह दवा लें",
            "take medicine after food": "भोजन के बाद दवा लें",
            "drink warm water": "गर्म पानी पिएं",
            "doctor is reviewing your case": "डॉक्टर आपके मामले की समीक्षा कर रहे हैं",
            "please come to the opd": "कृपया ओपीडी में आएं",
            "how are you feeling now?": "अब आप कैसा महसूस कर रहे हैं?",
        },
        "mr": {
            "what brings you to the hospital today?": "आज आपण रुग्णालयात कोणत्या कारणासाठी आला आहात?",
            "what is your main problem today?": "आज आपली मुख्य समस्या काय आहे?",
            "when did this problem first start?": "हा त्रास पहिल्यांदा कधी सुरू झाला?",
            "where exactly are you feeling the problem or pain?": "नक्की कुठे त्रास किंवा वेदना होत आहे?",
            "where exactly does it hurt?": "कुठे दुखत आहे?",
            "how would you describe it — sharp, dull, burning, pressure, or something else?": "वेदना कशी आहे — तीव्र टोचणारी, मंद, जळजळ किंवा दाब?",
            "how would you describe the pain?": "वेदना कशी वाटते?",
            "on a scale from 0 to 10, how severe is it right now?": "0 ते 10 च्या प्रमाणावर, सध्या त्रास किती तीव्र आहे?",
            "how severe is it from zero to ten?": "शून्य ते दहा मध्ये त्रास किती आहे?",
            "how long does it usually last?": "हा त्रास सहसा किती वेळ राहतो?",
            "does anything make it worse?": "कशाने हा त्रास वाढतो का?",
            "does anything make it feel better?": "कशाने आराम मिळतो का?",
            "are you experiencing any other symptoms along with this?": "यासोबत इतर काही लक्षणे जाणवत आहेत का?",
            "are you having any other symptoms?": "इतर काही त्रास होत आहे का?",
            "do you have any ongoing or previous medical conditions, such as diabetes, high blood pressure, or asthma?": "आपल्याला पूर्वीचे काही आजार आहेत का, जसे की मधुमेह, उच्च रक्तदाब किंवा दमा?",
            "do you have any previous or ongoing medical conditions?": "पूर्वीचा काही जुनाट आजार आहे का?",
            "have you ever had any surgeries or major procedures?": "आपली यापूर्वी कोणतीही शस्त्रक्रिया झाली आहे का?",
            "have you had any surgeries or major procedures?": "कोणती शस्त्रक्रिया झाली आहे का?",
            "are you currently taking any medicines or supplements?": "आपण सध्या काही औषधे घेत आहात का?",
            "are you taking any medicines or supplements?": "नियमित औषधे घेत आहात का?",
            "do you have any allergies to medicines, food, or anything else?": "औषधे, अन्न किंवा इतर कशाची ॲलर्जी आहे का?",
            "are you allergic to any medicines or food?": "कशाची ॲलर्जी आहे का?",
            "does anyone in your close family have an important medical condition?": "कुटुंबात कोणाला हृदयविकार, मधुमेह किंवा मोठा आजार आहे का?",
            "does anyone in your family have an important medical condition?": "कुटुंबात कोणाला आजार आहे का?",
            "is there anything about your smoking, alcohol, diet, work, or daily habits that you would like us to know?": "धूम्रपान, मद्यपान, आहार किंवा दिनचर्येबद्दल काही सांगायचे आहे का?",
            "apart from what we discussed, are you having any other new or unusual symptoms?": "आतापर्यंत चर्चा केलेल्या व्यतिरिक्त काही नवीन त्रास आहे का?",
            "if you know it, what is your prakriti or body constitution?": "आपणास आपली प्रकृती (वात, पित्त, कफ) माहिती आहे का?",
            "how would you describe your digestion or agni?": "आपली पचनक्रिया (अग्नि) कशी आहे?",
            "how would you describe your bowel pattern or koshta?": "पोट साफ होण्याची स्थिती कशी आहे?",
            "please tell me briefly about your usual diet.": "कृपया आपल्या नेहमीच्या आहाराबद्दल थोडक्यात सांगा.",
            "how is your usual sleep?": "आपली झोप कशी असते?",
            "is there anything important about your daily routine or lifestyle?": "दिनचर्येबद्दल काही महत्त्वाचे आहे का?",
            "do you have any medical reports, prescriptions, or other documents you would like to add?": "आपल्याकडे जुने अहवाल किंवा डॉक्टरांची चिठ्ठी आहे का?",
            "thank you. i have recorded your answers. you can review them before they are sent to the clinician.": "धन्यवाद. मी आपली उत्तरे नोंदवली आहेत. डॉक्टरांकडे पाठवण्यापूर्वी आपण ती तपासू शकता.",
            "your clinical history has been recorded and is ready for review by the clinician.": "आपला वैद्यकीय इतिहास नोंदवला गेला असून डॉक्टरांच्या पुनरावलोकनासाठी तयार आहे.",
            "hello": "नमस्कार",
            "yes": "होय",
            "no": "नाही",
            "none": "काही नाही",
            "other": "इतर",
            "fever": "ताप",
            "headache": "डोकेदुखी",
            "stomach pain": "पोटदुखी",
            "chest pain": "छातीत दुखणे",
            "sharp": "तीव्र टोचणारे",
            "dull": "मंद दुखणे",
            "burning": "जळजळ",
            "pressure": "दाब / जडपणा",
            "nausea": "मळमळ",
            "vomiting": "उलटी",
            "breathlessness": "श्वास घेण्यास त्रास",
            "rest": "विश्रांती",
            "medicine": "औषध",
            "food": "अन्न",
            "movement": "हालचालीमुळे",
            "stress": "तणाव",
            "diabetes": "मधुमेह",
            "high blood pressure": "उच्च रक्तदाब (बीपी)",
            "asthma": "दमा",
            "heart disease": "हृदयरोग",
            "please rest": "कृपया विश्रांती घ्या",
            "take this medicine": "हे औषध घ्या",
            "take medicine after food": "जेवणानंतर औषध घ्या",
            "drink warm water": "कोमट पाणी प्या",
            "doctor is reviewing your case": "डॉक्टर तुमच्या केसचे पुनरावलोकन करत आहेत",
        }
    }

    def _normalize_text(self, text: str) -> str:
        """Normalize text for dictionary lookup: lowercase, strip whitespace and trailing punctuation."""
        return text.lower().strip().rstrip('.!?').strip()

    def _lookup_offline(self, text: str, target_lang: str) -> Optional[str]:
        if not text:
            return text
        low = self._normalize_text(text)
        lang_dict = self.OFFLINE_CLINICAL_MAP.get(target_lang, {})

        # Build a normalized key map once per call (keys in the dict may or may not have trailing ?)
        # We compare normalized forms of both so "what brings you here today?" matches
        # whether or not the input has trailing punctuation.
        for k, v in lang_dict.items():
            norm_k = self._normalize_text(k)
            if low == norm_k:
                return v

        # Substring match (long keys only to avoid false positives)
        for k, v in lang_dict.items():
            norm_k = self._normalize_text(k)
            if len(norm_k) > 8 and (low == norm_k or (len(low) > 8 and low in norm_k)):
                return v

        # Reverse substring match
        for k, v in lang_dict.items():
            norm_k = self._normalize_text(k)
            if len(norm_k) > 10 and norm_k in low:
                return v

        return None

    def _fallback_mymemory(self, text: str, source_lang: str, target_lang: str) -> str:
        if not text or source_lang == target_lang:
            return text

        # Check offline dictionary first
        offline = self._lookup_offline(text, target_lang)
        if offline:
            return offline

        # Try MyMemory API
        try:
            url = f"https://api.mymemory.translated.net/get?q={requests.utils.quote(text)}&langpair={source_lang}|{target_lang}"
            r = requests.get(url, timeout=3.5)
            if r.status_code == 200:
                data = r.json()
                translated = data.get("responseData", {}).get("translatedText")
                if translated and not str(translated).startswith("MYMEMORY WARNING:"):
                    return translated
        except Exception:
            pass

        return text

    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        if not text or source_lang == target_lang:
            return text

        # Check offline clinical map first for instantaneous response
        offline = self._lookup_offline(text, target_lang)
        if offline:
            return offline

        if self.configured:
            payload = {
                "pipelineTasks": [{
                    "taskType": "translation",
                    "config": {
                        "language": {"sourceLanguage": source_lang, "targetLanguage": target_lang},
                        "serviceId": self.service_id,
                    },
                    "inputData": {"input": [{"source": text}]},
                }]
            }
            try:
                r = requests.post(
                    self.url, json=payload,
                    headers={"Authorization": self.key, "Content-Type": "application/json"},
                    timeout=10,
                )
                r.raise_for_status()
                data = r.json()
                return data["pipelineResponse"][0]["output"][0]["target"]
            except Exception as exc:
                print(f"Bhashini translation failed ({source_lang}->{target_lang}): {exc}")

        # Fallback to MyMemory translation
        return self._fallback_mymemory(text, source_lang, target_lang)

    def translate_options(self, options: list, source_lang: str, target_lang: str) -> list:
        if not options or source_lang == target_lang:
            return options
        return [self.translate(opt, source_lang, target_lang) for opt in options]

translation_provider = BhashiniTranslationProvider()

